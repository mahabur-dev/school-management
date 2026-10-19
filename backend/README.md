# School SaaS API

Multi-tenant school management backend: **NestJS 11 + Prisma 7 + PostgreSQL**.
One API and one database serve many schools; every school's data is isolated by
`school_id`, and a super admin creates and manages the schools.

## What is in the box

| Area | Status |
| --- | --- |
| Super admin creates a school and its first admin (temporary password, forced change) | Done |
| Login, refresh-token rotation with reuse detection, logout, logout-all, `me` | Done |
| Password change, and forgot / verify-OTP / reset flow | Done |
| Tenant isolation (`TenantGuard` + `prisma.forSchool()`), school suspend / activate | Done |
| Roles guard, rate limiting, validated env config, uniform responses and errors | Done |
| Tenant-scoped `users` module (reference for new modules) | Done |
| Feature toggles, per-school field config, students, invoices | Next (build on this base) |

## Quick start

Requirements: Node 22+, PostgreSQL 14+.

```bash
npm install
cp .env.example .env              # then edit DATABASE_URL and JWT_ACCESS_SECRET
npm run prisma:generate           # generates the client into src/generated/prisma
npx prisma migrate dev --name init   # creates prisma/migrations; commit that folder
npm run db:seed                   # super admin (+ two demo schools if SEED_DEMO_DATA=true)
npm run start:dev
```

- API: `http://localhost:5000/api/v1` · Swagger: `http://localhost:5000/api/docs` (not in production)
- Seeded logins (from `.env`): super admin `superadmin@example.com` / `ChangeMe#12345`;
  demo schools `admin-a@example.com` and `admin-b@example.com` / `DemoPass#123`.
  **Change these before any shared deployment.**

## Project structure

```
prisma/
  schema.prisma          single source of truth for tables and enums
  seed.ts                idempotent seed
prisma.config.ts         Prisma 7 config (datasource url, migrations path, seed)
src/
  main.ts                bootstrap only
  app.setup.ts           pipes, filters, CORS, helmet (shared with e2e tests)
  app.module.ts          modules + global guards (throttle -> auth -> roles)
  config/                env validation (class-validator) and typed config
  prisma/                PrismaService, tenant scoping, enum re-exports
  common/
    decorators/          @Public @Roles @CurrentUser @CurrentSchool
    guards/              JwtAuth, Roles, Tenant, SuperAdmin
    filters/ interceptors/ helpers/ transformers/ dto/ types/
  modules/
    auth/                login, sessions, password reset
    schools/             tenant root (service + repository)
    super-admin/         platform endpoints (create/list/suspend schools)
    users/               reference tenant-scoped module
    mail/ health/
test/                    e2e suite (needs a database)
```

Layering inside a module: **controller** (HTTP only) -> **service** (rules) ->
**repository** (the only place that talks to Prisma). Modules talk to each
other through exported services, never through each other's tables.

## Multi-tenancy rules

1. Every tenant table has `school_id` (indexed) and its model name is listed in
   `TENANT_MODELS` (`src/prisma/tenant-scope.ts`).
2. The school id comes from the verified JWT, never from request input. `TenantGuard`
   binds it to `request.school`, rejects suspended schools, and rejects an
   `x-school-id` header that disagrees with the token.
3. Tenant repositories use **`prisma.forSchool(schoolId)`**. It forces the school
   on reads, updates, deletes and creates, and strips `schoolId` from update data,
   so a repository cannot forget the filter or move a row to another school.
4. The plain `PrismaService` is unscoped. Use it only for auth lookups,
   super-admin work and tables with no school.
5. Super admins have `school_id = NULL` and use `SuperAdminGuard` routes;
   everyone else must have a school.

## Adding a tenant-scoped feature (checklist)

1. Add the model to `prisma/schema.prisma` with `schoolId`, `@@index([schoolId, ...])` and `@@map`.
2. Add its name to `TENANT_MODELS`. Run `npx prisma migrate dev --name add_<model>`.
3. Create `src/modules/<name>/` with `controller`, `service`, `repository`, `dto/`, `module`.
4. Controller: `@UseGuards(TenantGuard)` + `@Roles(...)`; take `@CurrentSchool()` and pass `school.id` down.
5. Repository: always `this.prisma.forSchool(schoolId).<model>...`; return explicit `select`s, never raw rows with secrets.
6. Register the module in `AppModule`.
7. Add an e2e case proving school A cannot read school B's rows (copy the `users` one).

## API overview

All routes are under `/api/v1`. Successful responses are `{ success: true, data }`;
errors are `{ success: false, statusCode, message, path, timestamp }`.

| Method | Path | Access |
| --- | --- | --- |
| POST | `/auth/login`, `/auth/refresh` | public (rate limited) |
| POST | `/auth/logout`, `/auth/logout-all` | any user |
| GET | `/auth/me` | any user |
| PATCH | `/auth/change-password` | any user |
| POST | `/auth/forgot-password`, `/auth/verify-reset-otp`, `/auth/reset-password` | public (rate limited) |
| POST, GET | `/super-admin/schools` | super admin |
| GET | `/super-admin/schools/:id` | super admin |
| PATCH | `/super-admin/schools/:id/status` | super admin |
| GET | `/users`, `/users/:id` | school admin (own school only) |
| GET | `/health` | public |

## Security notes

- Passwords: bcrypt (rounds from `BCRYPT_ROUNDS`, 10-15). Reset codes, refresh tokens
  and grants are stored only as SHA-256 hashes.
- Refresh tokens rotate on every use; replaying a used token revokes its whole family.
- Every request re-checks the session, user status and school status, so logout,
  deactivation and school suspension take effect immediately.
- Login and reset endpoints answer identically for unknown and known accounts and
  are rate limited. Production start-up fails on placeholder secrets, wildcard CORS,
  exposed dev tokens or a disabled rate limiter.
- `AUTH_EXPOSE_DEVELOPMENT_TOKENS=true` returns reset codes in responses for local
  work when no SMTP server is configured. Never enable it in production.

## Testing

```bash
npm test                 # unit tests (no database)
npm run lint && npm run format:check && npm run build

# e2e: needs an empty PostgreSQL database whose name contains "test" (it TRUNCATES tables)
createdb school_saas_test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/school_saas_test npx prisma migrate deploy
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/school_saas_test npm run test:e2e
```

The e2e suite covers login, school creation, tenant isolation (cross-school 404),
`x-school-id` mismatch, suspension, password change and reset, refresh-token reuse,
and rate limiting.

## Known limitations / roadmap

- Email verification OTP on self-registration, subdomain tenant resolution (`slug` is stored
  already), custom roles and permissions, feature toggles and field configuration,
  caching of the school status check, and Row Level Security as a second safety net.
- The `users.school_id` rule (null only for super admins) is enforced in code. Add a
  CHECK constraint in a migration when you want the database to enforce it too.
## Railway deployment

The backend includes a production multi-stage `Dockerfile` and
`railway.toml`. In Railway, set the service **Root Directory** to `/backend`.
The container applies pending Prisma migrations before starting the API; it
does not seed production data automatically.

Required production variables:

```env
NODE_ENV=production
API_PREFIX=api/v1
APP_NAME=School SaaS
APP_WEB_URL=https://your-frontend.example.com
CORS_ORIGINS=https://your-frontend.example.com
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=use-a-random-secret-with-at-least-32-characters
AUTH_EXPOSE_DEVELOPMENT_TOKENS=false
THROTTLE_DISABLED=false
```

Railway provides `PORT` automatically. Optional SMTP and authentication
duration variables can use the defaults documented in `.env.example`.
The configured health endpoint is `/api/v1/health`.

To create the first super administrator, run the seed once from a Railway
shell after setting secure `SEED_SUPER_ADMIN_EMAIL` and
`SEED_SUPER_ADMIN_PASSWORD` values:

```bash
npm run db:seed
```
