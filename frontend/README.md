# School SaaS frontend foundation

This is a design-free Next.js App Router foundation for two portals in one web app:

- `/super-admin/*` for platform management.
- `/dashboard/*` for the logged-in school's staff.

## Boundaries

- `src/app` owns routes and layouts only.
- `src/features` owns domain-specific API calls, state, and future UI.
- `src/components` owns reusable presentation components.
- `src/lib/api` owns the HTTP client and endpoint definitions.
- `src/types` contains API-facing types shared across features.

The frontend never chooses a tenant by accepting a school ID from the user. The
backend derives tenancy and authorization from the authenticated token.

## Start later

```bash
cp .env.example .env.local
npm install
npm run dev
```

The backend default development API URL is `http://localhost:5000/api/v1`.
