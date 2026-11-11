# Testing

How tests are written and run. Read this before adding or changing a test.

> **CI jobs** (`.github/workflows/ci.yml`): `web` (lint, typecheck, web coverage), `api` (lint,
> typecheck, migrations, API coverage against a `postgres:16` service), `e2e` (Playwright, with its
> own `postgres:16` service and a separate `users_e2e` database, migrated and seeded), `claude-hooks` and `security`. Both coverage runs
> enforce the 80% threshold of their package. A required-checks rule, if one is added, must list `web`, `api` and `e2e`.

> MSW is the Vitest network layer only. E2E runs against the real Express API and PostgreSQL.

- API tests (`apps/api`) use Vitest and supertest against `createApp()`: no port is opened. Tests
  that touch the database need Postgres, so run `pnpm db:up` first (the CI `api` and `e2e` jobs have a `postgres:16` service).
  Run them with `pnpm --filter @app/api test`.
- **A database per test file.** `createTestDb({ seed? })` from `apps/api/src/test/createTestDb.ts`
  creates a Postgres schema named `test_<random>`, applies the migrations in it (the `"public".`
  prefix drizzle-kit writes on enum types is rewritten to that schema), seeds the 25 users when
  `seed: true`, and drops the schema in `afterAll`. Call it once at the top of the file, with
  top-level `await`, and use the returned `db`. To test a route, pass it on:
  `request(createApp({ db: testDb.db })).get('/api/users')` (see `routes/users.list.test.ts`; the
  tests that need rows of their own, such as `users.search.test.ts`, start from an empty schema and
  insert them). Files running in parallel never see each other's
  rows. It reads `DATABASE_URL` and falls back to the local default of `.env.example`. A test of
  the migrations themselves (`db/migrate.test.ts`) creates a whole throwaway database instead,
  because the migration journal is per database. A run that is killed can leave a `test_*` schema
  behind; `pnpm db:destroy` removes it with the rest of the data.
- `renderRoute(path)` from `apps/web/src/test/renderWithProviders.tsx` renders the **real route tree** and
  returns `{ user, router, queryClient }`. Requests go to the MSW node server (`mocks/node.ts`);
  override one endpoint with `server.use(http.…)`. Handlers are reset after each test, and
  `localStorage`/`sessionStorage` are cleared before each test, so every test starts from the seed
  data.
- `asyncUtilTimeout` is raised to 3 s in `apps/web/src/test/setup.ts` because the 300 ms search debounce
  plus a request can exceed 1 s under a coverage run.
- jsdom applies no CSS. Tailwind v4 computes its palette colors as `oklch(...)`, not hex or rgb,
  which matters when asserting computed colors in Playwright.
- E2E runs against the production build (`pnpm build && pnpm preview --port 4173`) and never reuses a
  server already on that port, so a second worktree's preview (with its own API target) is never
  tested by mistake: a busy port fails the run. Set `E2E_PORT` (e.g. `E2E_PORT=4174 pnpm e2e`) and
  `E2E_API_PORT` to run two worktrees at once.
- **E2E gets its database from `E2E_DATABASE_URL`, which is required.** Playwright starts the API itself (`apps/api`, with
  `ALLOW_RESET=true`) on `E2E_API_PORT` (default 3101, so it never meets a `pnpm api:dev` on 3001),
  and the preview server proxies `/api` to it. Postgres must be running (`pnpm db:up`) with the
  migrations applied and the seed loaded (`pnpm db:migrate && pnpm db:seed`). `pnpm e2e` refuses
  to start without `E2E_DATABASE_URL` (no fallback to `DATABASE_URL`). It also refuses a value that is not a URL, is the
  same database as `DATABASE_URL` (parsed URLs are compared: host, port, name), is named `users_dev`,
  or has a host other than `localhost`, `127.0.0.1`, `[::1]` (the URL form of IPv6 loopback) or `db` (the Compose service) unless
  `E2E_ALLOW_REMOTE_DB=1` is set (the check is
  `apps/web/e2e-env.ts`, tested in `src/test/e2eEnv.test.ts`). **Every test starts with
  `POST /api/reset`** (the auto fixture in `tests/e2e/fixtures.ts`; every spec imports `test` and
  `expect` from it), which deletes all users in that database and re-inserts the 25 seed users.
  Pointed at your dev database, E2E would wipe your dev data, which is why it needs its own
  database: `E2E_DATABASE_URL=postgres://app:app@localhost:5432/users_e2e pnpm e2e` (migrate and seed
  that database once with `DATABASE_URL=<same url> pnpm db:migrate && pnpm db:seed`). Workers are limited to 1 and
  `fullyParallel` is off, because all tests share that one database. The fixture fails with a clear
  message when the API is down or `ALLOW_RESET` is off. `build-output.spec.ts` checks that `dist/`
  has no `mockServiceWorker.js` and no `msw` code. The two specs that fail a request keep their
  in-page `fetch` override.
  `tests/e2e/accessibility.spec.ts` covers axe checks and the 375 px layout. SPEC §6 requires an
  E2E journey for each feature.
- `pnpm e2e` builds for base `/`.
