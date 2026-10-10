This repository is a small fullstack teaching template (Node/Express backend + Nuxt3 frontend). The goal of this file is to give an AI coding agent the exact, discoverable facts it needs to be productive here.

High-level architecture
- Backend: Node.js + Express (MVC-lite). Key files: `backend/server.js`, `backend/app.js` (app bootstrap), `backend/openapi.json` (API spec served at `/openapi.json` and `/docs`).
- Router layer: `backend/routes/*.js` map endpoints to controllers. Example: `backend/routes/auth.routes.js` -> `backend/controllers/auth.controller.js`.
- Controllers: Thin request handling, validation, response shaping; live in `backend/controllers/*.js`.
- Repositories: Database access via Knex/MySQL (MariaDB). See `backend/repositories/*.js` and `backend/db/knex.js`.
- Middlewares: Authentication, error handling, uploads under `backend/middlewares/` (e.g., `requireAuth.js`, `error.js`, `upload.js`).

Why this structure
- Controllers focus on HTTP concerns; repositories encapsulate all DB queries. This separation is used across all features (users, auth, assignments, results, reports).

Important developer workflows (concrete)
- Run all services (recommended): from project root
  - docker-compose: `docker-compose up -d --build` (starts backend on 7000, frontend on 3000, db and phpMyAdmin)
- Backend local dev (no Docker):
  - cd `backend`
  - copy environment: `cp .env.example .env` (README documents this; file may not exist in some forks) and edit as needed
  - install: `npm install`
  - start dev server: `npm run dev` (uses `nodemon server.js`)
- Tests: backend uses `vitest`. From `backend` run `npm run test`.

Environment & config
- Common env names (from README/package.json and code):
  - `PORT` (default 7000)
  - `JWT_SECRET`, `JWT_EXPIRES` (auth)
  - `CORS_ORIGIN` (CSV list or omitted for '*')
  - DB connection is configured in `backend/db/knex.js` and typically via Docker compose; look at `docker-compose.yml` for concrete values.

Patterns and conventions to follow (exact, discoverable examples)
- Responses: controllers return a JSON object with `success: true/false` and either `data`, `items/total`, or `message`. Example: `backend/controllers/users.controller.js` (see `list`, `get`, `create`). Match existing shapes.
- Error handling: controllers call `next(e)` and the centralized `backend/middlewares/error.js` formats the HTTP response. Do not directly send stack traces.
- Auth: login returns `{ success, accessToken, user }` and protected routes expect `Authorization: Bearer <token>`. Token is signed with `JWT_SECRET`. See `backend/controllers/auth.controller.js` and `backend/middlewares/requireAuth.js`.
- DB access: prefer repository functions in `backend/repositories/*`. Use existing helpers like `findPage`, `countAll` (see `backend/repositories/users.js`) to implement pagination and searching consistent with front-end parameters (`page`, `itemsPerPage`, `sortBy`, `sortDesc`, `search`).
- Passwords: stored as `password_hash` and hashed with `bcrypt` at creation (`backend/controllers/users.controller.js`). Repositories avoid returning password hashes in SELECT queries.
- File uploads: `backend/controllers/upload.controller.js` returns `url` formed as `/uploads/<filename>`; static files served from `backend/uploads` via `app.use('/uploads', express.static(...))` in `server.js`.

Code examples (copy these patterns)
- Paginated list controller pattern (use `users.controller.js` as example):
  - parse query params: `page`, `itemsPerPage`, `sortBy`, `sortDesc`, `search`
  - call `usersRepo.findPage` and `usersRepo.countAll(search)` in parallel
  - respond: `{ success: true, items, total, page, itemsPerPage }`
- Auth login flow:
  - `usersRepo.findByEmail(email)` returns full user row (including password hash)
  - `bcrypt.compare(password, user.password_hash)` to verify
  - `jwt.sign({ id, role, name }, JWT_SECRET, { expiresIn: JWT_EXPIRES })`
  - response: `{ success:true, accessToken: token, user: { id, name, email, role } }`

Files and locations you will refer to most
- `backend/server.js` and `backend/app.js` - express setup and route wiring
- `backend/routes/*.js` - route definitions
- `backend/controllers/*.js` - request handlers (users, auth, upload, reports, results, assignments)
- `backend/repositories/*.js` - DB queries (Knex or raw SQL via knex.raw/execute)
- `backend/db/knex.js` - knex client configuration
- `backend/openapi.json` and `backend/docs` - API contract and example shapes
- `frontend/` - Nuxt3 frontend that depends on the API shapes above (look at `stores/auth.ts` and `pages/*.vue` for expected request/response shapes)

Quick troubleshooting hints
- 401 on protected endpoints: check `Authorization` header format `Bearer <token>` and `JWT_SECRET` parity between sign and verify.
- DB errors: inspect `docker-compose_mysql.yml` / `docker-compose.yml` for DB credentials used by the app and `02_schema.sql` for table definitions.
- Missing env file: README advises copying `.env.example`; if `.env.example` is missing, prefer to inspect `docker-compose.yml` values or `backend/db/knex.js` to infer required vars.

What not to change without confirmation
- Global response schema (success/data/message shapes). Changing these requires updating frontend expectations in `frontend/stores` and `pages`.
- Authentication contract (field names in login response). Frontend expects `accessToken` and `user` with `id, name, email, role`.

If you need more context
- Read `backend/README.md` and `frontend/README.md` for run recipes. Inspect `docker-compose.yml` and `docker-compose_mysql.yml` for environment values used during CI/teaching runs.

If content here looks incomplete or you want me to add examples for other areas (assignments/results/reports), tell me which endpoint or file to inspect and I'll update this file.
