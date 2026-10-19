# SchoolSaaS Web

The SchoolSaaS web application provides two role-specific experiences in one
Next.js application:

- a platform portal for the super administrator; and
- a tenant-aware workspace for each school's administrator.

It is built with Next.js 16, React 19, TypeScript, and CSS Modules. The interface
uses a shared visual system for navigation, forms, tables, selectors, feedback,
and dialogs so new modules can be added without creating a separate design style.

## Implemented experience

### Authentication

- Separate platform and school login pages
- School lookup by name or workspace slug
- Tenant-specific login URL (`/login/:tenantSlug`)
- Remember-me support through the backend refresh session
- Password visibility, loading, validation, and error states
- Role-aware redirects and protected dashboard layouts
- Profile editing and logout

Google, Microsoft, and SSO controls currently communicate that those providers
are not configured; they are not working authentication integrations.

### Super-admin portal

- Platform overview
- School directory with search
- School workspace creation and initial administrator setup
- Student Management feature policy per school
- Fee & Invoice Management feature policy per school
- Configurable visible/required fields for both modules
- Super-admin profile

### School portal

- Dashboard overview
- Student search and complete create/view/edit/delete workflow
- Dynamic student fields based on the platform policy
- Reusable month/day/year date selector
- Finance navigation shown only when the school has access
- Finance overview, fee categories, class-wise fee structures, invoices, and payments
- Invoice detail, issue/void actions, print, and PDF download
- Transaction-safe payment recording and reversal interface
- Finance tab inside each student's detail view
- School profile

## Requirements

- Node.js 22+
- npm 10+
- A running SchoolSaaS backend

## Local setup

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The backend should be running at `http://localhost:5000`. If it uses another
origin, update `NEXT_PUBLIC_API_URL` before starting Next.js.

## Environment variables

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_TENANT_NAME=Demo School A
NEXT_PUBLIC_TENANT_SLUG=demo-school-a
```

| Variable                  | Purpose                                                       |
| ------------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`     | Complete versioned backend base URL; do not omit `/api/v1`    |
| `NEXT_PUBLIC_TENANT_NAME` | Fallback school name for the fixed school-login entry page    |
| `NEXT_PUBLIC_TENANT_SLUG` | Fallback workspace slug for the fixed school-login entry page |

`NEXT_PUBLIC_*` values are embedded into the browser bundle at build time. They
must not contain secrets.

## Main routes

| Route                   | Audience     | Purpose                                           |
| ----------------------- | ------------ | ------------------------------------------------- |
| `/`                     | Public       | Redirects to the appropriate entry flow           |
| `/login`                | School admin | Find a school workspace and continue to its login |
| `/login/:tenantSlug`    | School admin | Tenant-specific sign in                           |
| `/super-admin/login`    | Super admin  | Platform sign in                                  |
| `/dashboard`            | School admin | School overview                                   |
| `/dashboard/students`   | School admin | Student records and student finance statement     |
| `/dashboard/finance`    | School admin | Fee, invoice, and payment workspace               |
| `/dashboard/profile`    | School admin | Account and school profile                        |
| `/super-admin`          | Super admin  | Platform overview                                 |
| `/super-admin/schools`  | Super admin  | School directory and provisioning                 |
| `/super-admin/features` | Super admin  | Student Management policy                         |
| `/super-admin/finance`  | Super admin  | Fee & Invoice Management policy                   |
| `/super-admin/profile`  | Super admin  | Platform account profile                          |

## Project structure

```text
frontend/src/
├── app/                       Routes and role-specific layouts
│   ├── (public)/              Login routes
│   ├── (school)/              School workspace routes
│   └── (super-admin)/         Platform routes
├── components/
│   ├── auth/                  Session gate
│   ├── layout/                Shared dashboard shell and tenant switcher
│   └── ui/                    Icons, page header, selector, search, toast
├── features/
│   ├── auth/                  Login and session restoration
│   ├── dashboard/             School dashboard
│   ├── features/              Feature-control screens and API
│   ├── finance/               Fee, invoice, payment, and statement UI
│   ├── profile/               User and school profile UI
│   ├── schools/               Platform school management
│   └── students/              Dynamic student workflow
├── lib/
│   ├── api/                   Fetch client, endpoints, and error mapping
│   ├── auth/                  In-memory access-token session boundary
│   └── finance/               Minor-unit money helpers
└── types/                     Shared API-facing TypeScript models
```

Route files stay small and assemble feature components. Domain API calls and UI
state live under `features`; cross-domain presentation belongs under
`components`; transport and session behavior belongs under `lib`.

## API and tenant behavior

The API client:

- uses the configured `NEXT_PUBLIC_API_URL`;
- sends access tokens as Bearer tokens;
- includes credentials so the backend refresh cookie can be used;
- unwraps the backend's `{ success, data }` response envelope;
- maps error responses into a shared `ApiError`; and
- has a separate blob request path for invoice PDFs.

The browser never sends a user-selected school ID to establish tenant ownership.
School context comes from the authenticated backend session. Super-admin feature
screens may select a school because those are explicitly platform-scoped routes.

The access token is kept in memory rather than `localStorage`. On a full page
refresh, protected layouts use the backend's HTTP-only refresh cookie to restore
the in-memory session. Restoration requests share one in-flight operation so
React development-mode effect replays cannot reuse a single-use refresh token.

## Feature-driven forms

Student and finance forms load their configured field policy from the backend.
Core accounting and student identity fields remain locked, while optional fields
can be made visible and required per school. The UI sends only writable field
values; catalogue metadata such as label, type, and sort order stays owned by the
backend.

Feature controls and school-side forms use the same field contract, preventing
the administration screen and data-entry screens from drifting apart.

## Reusable interface components

- `DashboardShell` supplies desktop/mobile navigation, profile menu, logout, and
  consistent workspace identity.
- `PageHeader`, `SearchInput`, and `OptionSelect` keep controls consistent across
  modules.
- The toast provider supplies auto-dismissing success and error feedback.
- `AppIcon` centralizes icons so feature screens do not introduce unrelated icon
  styles.
- Finance money helpers convert API minor units without floating-point storage.

## Scripts

| Command             | Purpose                               |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start the Next.js development server  |
| `npm run build`     | Create an optimized production build  |
| `npm start`         | Serve the production build            |
| `npm run lint`      | Run ESLint                            |
| `npm run typecheck` | Run TypeScript without emitting files |

Before submitting or deploying a change, run:

```bash
npm run lint
npm run typecheck
npm run build
```

## Production deployment

The frontend can be deployed to any platform that supports Next.js. Configure
the environment before building:

```env
NEXT_PUBLIC_API_URL=https://your-api.example.com/api/v1
NEXT_PUBLIC_TENANT_NAME=Your School
NEXT_PUBLIC_TENANT_SLUG=your-school
```

On the backend, set both `APP_WEB_URL` and `CORS_ORIGINS` to the deployed frontend
origin. Use HTTPS for both services. The current refresh cookie uses
`SameSite=Lax`; deploy the frontend and API under the same site, or deliberately
adjust and review the cookie policy before using unrelated hosting domains.

## Current limitations

- Teachers, staff, attendance, classes, exams, notices, platform users, system
  activity, and announcements are navigation placeholders, not implemented
  modules.
- Google, Microsoft, and organisation SSO are presentation-only controls.
- The password-reset API exists, but the complete reset journey is not yet wired
  into the frontend.
- The current dashboards contain presentation data in addition to live module
  data; a later reporting phase should replace all summary placeholders with
  backend analytics.
- AI duplicate detection and responsive data-table enhancements are outside this
  MVP.
