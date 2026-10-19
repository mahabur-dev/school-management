# SchoolSaaS

SchoolSaaS is a multi-tenant school administration platform built as a practical
MVP. A platform administrator can create and manage school workspaces, control
which modules each school may use, and configure the fields shown in those
modules. School administrators get a separate workspace for student records,
fees, invoices, and payments.

This repository contains both applications:

- [`backend`](./backend) — NestJS REST API, Prisma, and PostgreSQL
- [`frontend`](./frontend) — Next.js web application for the platform and school portals

The current version is suitable for an assignment review and as the foundation
for a larger product. It focuses on clear tenant boundaries, predictable business
rules, reusable UI, and an auditable finance workflow rather than presenting
unfinished modules as complete.

## What is implemented

### Platform administration

- Dedicated super-admin login and dashboard
- School workspace creation, listing, search, activation, and suspension
- Automatic creation of each school's first administrator
- Per-school feature access for Student Management and Fee & Invoice Management
- Per-school visibility and required-field configuration
- Platform and school profile screens

### School workspace

- Tenant-aware school login and protected dashboard
- Dynamic student form driven by the school's field configuration
- Student search, create, view, edit, and soft delete
- Date-of-birth selector and configurable optional fields
- Finance overview with totals for invoiced, collected, outstanding, and overdue amounts
- Fee categories and class-wise fee structures
- Draft, issue, view, void, print, and PDF-download invoice workflow
- Manual payments, partial/multiple invoice allocations, payment history, and reversals
- Student-level invoice and payment statement

### Platform foundations

- JWT access tokens and rotating refresh-token sessions
- Password change and OTP-based password reset backend flow
- Role, tenant, feature, and rate-limit guards
- Tenant-scoped Prisma access and cross-tenant protection
- Validated environment configuration and consistent API responses
- Unit and end-to-end tests for security and business rules
- Docker/Railway backend deployment support

## Technology

| Layer           | Stack                                                   |
| --------------- | ------------------------------------------------------- |
| Web application | Next.js 16, React 19, TypeScript, CSS Modules           |
| API             | NestJS 11, TypeScript, Swagger/OpenAPI                  |
| Data            | PostgreSQL, Prisma 7                                    |
| Authentication  | Passport JWT, bcrypt, rotating HTTP-only refresh cookie |
| Documents       | PDFKit                                                  |
| Testing         | Jest, Supertest                                         |
| Deployment      | Docker, Railway-ready backend                           |

## Run locally

### Requirements

- Node.js 22 or later
- npm 10 or later
- PostgreSQL 14 or later

### 1. Start the backend

```bash
cd backend
npm ci
cp .env.example .env
```

Update at least `DATABASE_URL` and `JWT_ACCESS_SECRET` in `backend/.env`, then run:

```bash
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run start:dev
```

The API will be available at `http://localhost:5000/api/v1`. Development Swagger
documentation is available at `http://localhost:5000/api/docs`.

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The example frontend environment already points to
the default local API URL.

The seed command uses the credentials configured in the backend environment. If
`SEED_DEMO_DATA=true`, it also creates the two demo school workspaces documented
in the [backend guide](./backend/README.md). Never use example credentials in a
shared or production deployment.

## Repository layout

```text
school-management/
├── backend/                 NestJS application, Prisma schema, migrations, tests
├── frontend/                Next.js application and reusable UI/features
└── README.md                Project-level overview
```

Each application has a detailed guide:

- [Backend setup, API, architecture, testing, and deployment](./backend/README.md)
- [Frontend routes, features, architecture, and production setup](./frontend/README.md)

## Current MVP boundary

Teachers, staff, attendance, classes, exams, notices, announcements, system
activity, and third-party sign-in appear only as future navigation or interface
directions; their business modules are not implemented in this release. AI-based
duplicate detection is also intentionally outside the current MVP. See the
application guides for the remaining technical limitations.
