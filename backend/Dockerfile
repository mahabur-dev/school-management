# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

WORKDIR /app
ENV CI=true

# OpenSSL is required by Prisma; dumb-init forwards Railway shutdown signals
# cleanly to NestJS so in-flight requests can finish.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates dumb-init openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS development-dependencies

COPY package.json package-lock.json ./
RUN npm ci

FROM development-dependencies AS build

COPY nest-cli.json tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

# `prisma generate` validates that a datasource URL exists but does not connect
# to it. Railway secrets are intentionally unavailable to image build layers,
# so use a non-routable build-only value. The runtime migration and API use the
# real DATABASE_URL injected by Railway.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build npm run build

FROM base AS production-dependencies

ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force

FROM base AS runtime

ENV NODE_ENV=production \
  PORT=5000 \
  NODE_OPTIONS=--enable-source-maps

RUN groupadd --system --gid 1001 nestjs \
  && useradd --system --uid 1001 --gid nestjs --home-dir /app nestjs

COPY --from=production-dependencies --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nestjs /app/dist ./dist

# Prisma CLI needs the migration history and config at release time. Secrets
# stay in Railway variables and are never copied into the image.
COPY --chown=nestjs:nestjs prisma ./prisma
COPY --chown=nestjs:nestjs prisma.config.ts package.json ./
COPY --chown=nestjs:nestjs docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod 0555 ./docker-entrypoint.sh

USER nestjs
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "const port=process.env.PORT||'5000';fetch('http://127.0.0.1:'+port+'/api/v1/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

ENTRYPOINT ["dumb-init", "--", "./docker-entrypoint.sh"]
