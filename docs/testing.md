# Testing

How tests are written and run. Read this before adding or changing a test.

> **CI jobs** (`.github/workflows/ci.yml`): `web` (lint, typecheck, web coverage), `api` (lint,
> typecheck, migrations, API coverage against a `postgres:16` service), `e2e` (Playwright, with its
> own `postgres:16` service and migrations), `claude-hooks` and `security`. Both coverage runs
> enforce the 80% threshold of their package. A required-checks rule, if one is added, must list `web`, `api` and `e2e`.

> Until #46 merges, E2E runs against the browser's MSW mock. After it, MSW stays only as the
> Vitest network layer and E2E runs against the Express API and PostgreSQL.

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
- E2E runs against the production build (`pnpm build && pnpm preview --port 4173`) and reuses a
  server that is already running on that port. Set `E2E_PORT` (e.g. `E2E_PORT=4174 pnpm e2e`) when
  another worktree may be running E2E; otherwise the run may test that worktree's build.
  `tests/e2e/accessibility.spec.ts` covers axe checks and the 375 px layout. SPEC §6 requires an
  E2E journey for each feature.
- `pnpm e2e` builds for base `/`. GitHub Pages serves the app under `/claude-training/`, which
  `tests/e2e/subpath.spec.ts` covers: the redirect, a reload on a user's page, create and reload,
  and the service worker scope. The reload is answered by `vite preview`'s own SPA fallback, so
  the `404.html` copy that Pages relies on (`deploy.yml`) is not tested here. The spec is skipped
  unless `BASE_PATH` is set. CI runs it as a separate step of the `e2e` job after `pnpm e2e`. Locally:

  ```bash
  MSYS_NO_PATHCONV=1 BASE_PATH=/claude-training/ E2E_PORT=4180 pnpm --filter @app/web exec playwright test tests/e2e/subpath.spec.ts
  ```

  (`MSYS_NO_PATHCONV=1` stops Git Bash from rewriting the path; use a port nothing else is
  listening on.) `BASE_PATH` is appended to `baseURL`, so this spec uses relative paths
  (`goto('./')`). The other specs use absolute paths such as `goto('/users')`, which leave the
  base path, so with `BASE_PATH` set `playwright.config.ts` runs only the subpath spec.
