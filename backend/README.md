# SchoolSaaS API

The SchoolSaaS API is a multi-tenant backend for platform administration,
student records, and school fee management. One PostgreSQL database serves all
schools, while the application enforces tenant ownership on every school-owned
record.

The API is built with NestJS 11, Prisma 7, and PostgreSQL. It follows a modular
controller → service → repository structure and keeps authorization and business
rules in the backend rather than trusting the browser.

## Implemented modules

| Module                  | Included capabilities                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication          | Portal-aware login, refresh rotation, reuse detection, logout, logout-all, current user, profile update, password change, and password reset |
| Platform administration | Create/list/view schools, activate or suspend a school, and provision its first administrator                                                |
| Feature controls        | Per-school module enablement and configurable field visibility/requiredness                                                                  |
| Students                | Tenant-scoped list/search, create, view, edit, soft delete, and configuration-driven validation                                              |
| Fee setup               | Finance settings, fee categories, and versioned class/year fee structures                                                                    |
| Invoices                | Draft/update/issue/void lifecycle, atomic numbering, immutable issued data, balances, and branded PDF documents                              |
| Payments                | Transaction-safe recording, partial allocations, idempotency protection, history, and auditable reversal                                     |
| Student finance         | Per-student invoice, payment, outstanding, and overdue statement                                                                             |
| Operations              | Health check, validated configuration, email delivery abstraction, rate limiting, and consistent responses                                   |

Student Management is enabled for new schools by default. Fee & Invoice
Management is created disabled and must be enabled for the school by a super
administrator.

## Requirements

- Node.js 22+
- npm 10+
- PostgreSQL 14+

## Local setup

```bash
cd backend
npm ci
cp .env.example .env
```

Create a PostgreSQL database, then set `DATABASE_URL` and replace the example JWT
secret in `.env`. Generate a secure secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Apply the committed migrations, seed the initial data, and start the API:

```bash
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run start:dev
```

Local endpoints:

- API base: `http://localhost:5000/api/v1`
- Health: `http://localhost:5000/api/v1/health`
- Swagger: `http://localhost:5000/api/docs`

Swagger is intentionally disabled when `NODE_ENV=production`.

## Environment variables

Use `.env.example` as the source template.

| Variable                               | Purpose                                         | Local default/requirement                             |
| -------------------------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| `NODE_ENV`                             | Runtime environment                             | `development`                                         |
| `PORT`                                 | HTTP port                                       | `5000`; Railway supplies this automatically           |
| `API_PREFIX`                           | Global API prefix                               | `api/v1`                                              |
| `APP_NAME`                             | Application and email name                      | `School SaaS`                                         |
| `APP_WEB_URL`                          | Public frontend URL used in links               | `http://localhost:3000`                               |
| `CORS_ORIGINS`                         | Comma-separated allowed browser origins         | `http://localhost:3000`                               |
| `DATABASE_URL`                         | PostgreSQL connection string                    | Required                                              |
| `JWT_ACCESS_SECRET`                    | Access-token signing secret                     | Required; minimum 32 characters and not a placeholder |
| `JWT_ACCESS_EXPIRES_IN`                | Access-token lifetime                           | `15m`                                                 |
| `REFRESH_TOKEN_EXPIRES_IN`             | Standard refresh lifetime                       | `7d`                                                  |
| `REMEMBER_ME_REFRESH_TOKEN_EXPIRES_IN` | Remember-me refresh lifetime                    | `30d`                                                 |
| `PASSWORD_RESET_EXPIRES_IN`            | Password reset OTP lifetime                     | `1h`                                                  |
| `PASSWORD_RESET_GRANT_EXPIRES_IN`      | Verified reset grant lifetime                   | `15m`                                                 |
| `BCRYPT_ROUNDS`                        | Password hashing cost                           | `12` (allowed: 10–15)                                 |
| `THROTTLE_DISABLED`                    | Disables rate limits for automated tests        | Must be `false` in production                         |
| `AUTH_EXPOSE_DEVELOPMENT_TOKENS`       | Returns reset codes without SMTP for local work | Must be `false` in production                         |
| `SMTP_*`, `MAIL_FROM`                  | Transactional email transport                   | Optional locally                                      |
| `SEED_SUPER_ADMIN_*`                   | Initial super-admin credentials                 | Used only by the seed command                         |
| `SEED_DEMO_DATA`                       | Creates two demo school tenants                 | Recommended `false` outside local development         |

Production startup fails deliberately when it detects a placeholder signing
secret, wildcard CORS, exposed development tokens, or disabled throttling.

## Seed behavior

`npm run db:seed` is idempotent. It:

1. creates the configured super administrator if it does not exist;
2. optionally creates two demo schools when `SEED_DEMO_DATA=true`;
3. synchronizes the developer-owned feature catalogue; and
4. backfills feature configuration for existing schools without overwriting an
   administrator's current choices.

The default local examples are:

- Super admin: `superadmin@example.com` / `ChangeMe#12345`
- Demo School A: `admin-a@example.com` / `DemoPass#123`
- Demo School B: `admin-b@example.com` / `DemoPass#123`

These values are development conveniences only. Supply strong credentials
through environment variables and disable demo data for any shared deployment.

## API conventions

All application routes are under `/api/v1`. A successful JSON response has this
shape:

```json
{ "success": true, "data": {} }
```

Errors use a consistent structure:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "path": "/api/v1/example",
  "timestamp": "2026-10-19T12:00:00.000Z"
}
```

Authentication uses an `Authorization: Bearer <access-token>` header. The
rotating refresh token is delivered as a scoped HTTP-only cookie. Payment create
requests accept an `Idempotency-Key` header to make safe retries possible.

## Route summary

| Area                    | Routes                                                                        | Access                                    |
| ----------------------- | ----------------------------------------------------------------------------- | ----------------------------------------- |
| Health                  | `GET /health`                                                                 | Public                                    |
| Authentication          | `/auth/login`, `/auth/resolve-tenant`, `/auth/refresh`, password reset routes | Public, rate limited                      |
| Current account         | `/auth/me`, `/auth/change-password`, `/auth/logout`, `/auth/logout-all`       | Authenticated                             |
| Schools                 | `/super-admin/schools` and status route                                       | Super admin                               |
| Feature catalogue       | `/super-admin/features`                                                       | Super admin                               |
| School feature policy   | `/super-admin/schools/:id/features/:key` and `/fields`                        | Super admin                               |
| Current school features | `/me/features` and `/me/features/:key/fields`                                 | School admin                              |
| School profile          | `PATCH /schools/me`                                                           | School admin                              |
| Students                | `/students` and `/students/:id`                                               | School admin + Student Management enabled |
| Fee categories          | `/finance/fee-categories`                                                     | School admin + Fee Management enabled     |
| Fee structures          | `/finance/fee-structures`                                                     | School admin + Fee Management enabled     |
| Invoices                | `/finance/invoices`, lifecycle, balance, payments, and PDF routes             | School admin + Fee Management enabled     |
| Payments                | `/finance/payments` and reversal route                                        | School admin + Fee Management enabled     |
| Student statement       | `/finance/students/:studentId/statement`                                      | School admin + Fee Management enabled     |

Use development Swagger for DTO details and request examples.

## Architecture

```text
backend/
├── prisma/
│   ├── schema.prisma          Prisma entry point
│   ├── models/                Domain-specific schema files
│   ├── migrations/            Committed database migrations
│   └── seed.ts                Idempotent initial data and feature backfill
├── src/
│   ├── common/                Guards, decorators, pipes, errors, helpers
│   ├── config/                Typed configuration and startup validation
│   ├── modules/               Auth, schools, features, students, finance, etc.
│   ├── prisma/                Prisma service and tenant-scoped extension
│   ├── app.module.ts          Module and global guard registration
│   ├── app.setup.ts           Shared HTTP pipeline
│   └── main.ts                Application bootstrap
├── test/                      End-to-end tests
├── Dockerfile
└── railway.toml
```

Controllers translate HTTP input, services enforce business rules, and
repositories own database access. Cross-module behavior goes through exported
services instead of reaching into another module's tables.

## Tenant isolation

- Every tenant-owned model carries `schoolId` and is registered in
  `TENANT_MODELS`.
- `TenantGuard` resolves the school from the authenticated user, rejects a
  suspended school, and prevents a conflicting `x-school-id` header.
- Tenant repositories use `prisma.forSchool(schoolId)`, which injects the tenant
  into reads and writes and prevents changing a row's owner.
- Feature-protected routes use `@UseGuards(TenantGuard, FeatureGuard)` in that
  order because feature evaluation depends on the resolved school.
- Super-admin routes use the unscoped Prisma service and are protected by
  `SuperAdminGuard`.
- Student roll numbers are unique by school and class only for non-deleted rows;
  PostgreSQL enforces this with a partial unique index.

## Finance invariants

- Monetary values are stored as integer minor units (`BigInt`), never floating
  point values.
- Fee structures are editable as drafts and frozen after activation.
- Invoice numbers are assigned atomically when a draft is issued.
- Issued invoice items and snapshots are immutable.
- Payments and allocations are created in one transaction and cannot exceed an
  invoice's outstanding amount.
- Posted payments are never edited or deleted; a reversal creates a traceable
  audit record and restores the relevant balances.
- Every finance relation includes tenant ownership checks.

## Security decisions

- Passwords are hashed with bcrypt.
- Refresh tokens, password reset codes, and reset grants are stored as hashes.
- Refresh tokens rotate; replaying an already-used token revokes its session
  family.
- User, session, and school status are checked on authenticated requests.
- Helmet, explicit CORS, request validation, DTO whitelisting, and rate limiting
  are enabled globally.
- Validation rejects unknown request fields rather than silently accepting them.
- Password-reset responses do not reveal whether an account exists.

## Scripts

| Command                                   | Purpose                                   |
| ----------------------------------------- | ----------------------------------------- |
| `npm run start:dev`                       | Start the API with watch mode             |
| `npm run build`                           | Generate Prisma Client and compile NestJS |
| `npm run start:prod`                      | Run the compiled application              |
| `npm run prisma:generate`                 | Generate Prisma Client                    |
| `npm run prisma:migrate -- --name <name>` | Create a development migration            |
| `npm run prisma:deploy`                   | Apply committed migrations                |
| `npm run prisma:studio`                   | Open Prisma Studio                        |
| `npm run db:seed`                         | Run the idempotent seed                   |
| `npm test`                                | Run unit tests                            |
| `npm run test:e2e`                        | Run end-to-end tests                      |
| `npm run lint`                            | Run ESLint                                |
| `npm run format:check`                    | Check formatting                          |

## Testing

Unit tests cover environment validation, guards, tenant scoping, authentication
sessions, feature policy, field validation, invoice rules, PDF generation,
payments, balances, and school repositories.

The end-to-end suite requires a dedicated PostgreSQL database whose name contains
`test`; it clears database tables and must never point to development or
production data.

```bash
createdb school_saas_test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/school_saas_test npm run prisma:deploy
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/school_saas_test npm run test:e2e
```

Run the standard verification set before submitting a change:

```bash
npm run lint
npm run format:check
npm test
npm run build
```

## Docker and Railway deployment

The multi-stage `Dockerfile` builds a small non-root production image. On startup,
the entrypoint applies pending migrations and then starts the API. It does not run
the seed automatically.

For Railway:

1. create a service from the repository;
2. set its Root Directory to `/backend`;
3. let Railway use `backend/railway.toml` and `backend/Dockerfile`;
4. add the production variables below; and
5. deploy, then verify `/api/v1/health` reports `database: "up"`.

```env
NODE_ENV=production
API_PREFIX=api/v1
APP_NAME=School SaaS
APP_WEB_URL=https://your-frontend.example.com
CORS_ORIGINS=https://your-frontend.example.com
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=a-unique-random-secret-with-at-least-32-characters
AUTH_EXPOSE_DEVELOPMENT_TOKENS=false
THROTTLE_DISABLED=false
SEED_DEMO_DATA=false
```

Do not set `PORT` on Railway; the platform injects it. If the production database
does not already contain a super administrator, run `npm run db:seed` once from a
Railway shell after setting secure seed credentials.

## Current limitations

- The API defines roles for teachers, students, and parents, but the current MVP
  only exposes operational portals for super admins and school admins.
- Email/password authentication is complete; Google, Microsoft, and organisation
  SSO are not integrated.
- Swagger is development-only.
- AI duplicate detection, automated recurring invoice generation, online payment
  gateways, accounting exports, and database-level Row Level Security are future
  work.
