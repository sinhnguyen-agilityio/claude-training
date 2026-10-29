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
  server that is already running. `tests/e2e/accessibility.spec.ts` covers axe checks and the
  375 px layout. SPEC §6 requires an E2E journey for each feature.
