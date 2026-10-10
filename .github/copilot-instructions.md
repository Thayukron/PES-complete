# Notes for AI coding agents — PES (Personnel Evaluation System)

Full-stack teaching/competition project: Node/Express API + Nuxt 3 (SPA) + MySQL. UI text is Thai.

## Architecture
- `backend/routes/index.js` — every API route and its role guard (`auth()`, `auth('admin')`, ...). Start here.
- `backend/controllers/*.controller.js` — controllers talk to Knex directly (no repository layer). Wrap handlers with `ah()` from `utils/authz.js` and throw `httpError(status, 'ข้อความไทย')`.
- `backend/utils/authz.js` — `resolvePeriod`, `isAssigned`, `assertCanView` (admin = all, evaluator = assigned evaluatees, evaluatee = self). Reuse these for every evaluatee-scoped endpoint.
- `backend/utils/scoring.js` — pure scoring functions (unit tested). `utils/progress.js` — bulk progress summary used by dashboard/monitor/reports.
- Files are stored in `backend/uploads/<evaluatee_id>/` and served ONLY via `GET /api/attachments/:id/file` (permission checked). Never add `express.static` for uploads.
- Frontend calls same-origin `/api/**`; `frontend/server/api/[...path].ts` proxies to `NUXT_API_INTERNAL`.

## Conventions
- Responses: `{ success: true, data }` or list `{ success, items, total }`; errors `{ success: false, message }` (Thai).
- Login returns `{ success, accessToken, user: { id, name, email, role, ... } }`; JWT payload `{ id, role, name }`.
- Evaluation rows have `status: draft | submitted`; submitted rows are locked until admin `reopen`.
- Frontend pages declare access with `definePageMeta({ roles: [...] })`; menus live in `composables/useMenu.js`.
- Shared UI: `PageHeader`, `PeriodSelect` (global selected period via `usePeriods`), `FileList`, `ScoreInput`, `useNotify().apiError(e)`, `useConfirm()`.

## Workflows
- `docker compose up -d --build` (web :3000, api :7000, phpMyAdmin :8082, MySQL :3308). Seed password for all demo users: `Pes@2568`.
- Reset DB: `docker compose down -v` (re-runs `schema.sql`).
- Tests: `cd backend && npm test` (integration tests need the DB; they skip otherwise), `cd frontend && npm test`.
- When adding an endpoint: route in `routes/index.js` + controller + entry in `backend/openapi.json` + a case in `backend/test/api.spec.js`.
