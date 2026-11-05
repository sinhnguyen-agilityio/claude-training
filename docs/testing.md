# Testing

How tests are written and run. Read this before adding or changing a test.

- `renderRoute(path)` from `src/test/renderWithProviders.tsx` renders the **real route tree** and
  returns `{ user, router, queryClient }`. Requests go to the MSW node server (`mocks/node.ts`);
  override one endpoint with `server.use(http.…)`. Handlers are reset after each test, and
  `localStorage`/`sessionStorage` are cleared before each test, so every test starts from the seed
  data.
- `asyncUtilTimeout` is raised to 3 s in `src/test/setup.ts` because the 300 ms search debounce
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
  unless `BASE_PATH` is set. CI runs it as a separate step after `pnpm e2e`. Locally:

  ```bash
  MSYS_NO_PATHCONV=1 BASE_PATH=/claude-training/ E2E_PORT=4180 pnpm exec playwright test tests/e2e/subpath.spec.ts
  ```

  (`MSYS_NO_PATHCONV=1` stops Git Bash from rewriting the path; use a port nothing else is
  listening on.) `BASE_PATH` is appended to `baseURL`, so this spec uses relative paths
  (`goto('./')`). The other specs use absolute paths such as `goto('/users')`, which leave the
  base path, so with `BASE_PATH` set `playwright.config.ts` runs only the subpath spec.
