import { defineConfig, devices } from '@playwright/test'

// E2E_PORT lets two worktrees run E2E at once. With one fixed port, reuseExistingServer below
// would make the second run test the first worktree's build.
// An empty or non-numeric value falls back to the default instead of becoming port 0 or NaN.
const PORT = Number(process.env.E2E_PORT) || 4173

// The API gets its own port so an E2E run never talks to (or resets) a `pnpm api:dev` on 3001.
const API_PORT = Number(process.env.E2E_API_PORT) || 3101
// POST /api/reset wipes the database the API points at. E2E_DATABASE_URL lets E2E use its own
// database (migrated and seeded once) instead of the dev one.
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgres://app:app@localhost:5432/users_dev'

export default defineConfig({
  testDir: './tests/e2e',
  // A BASE_PATH build only runs the subpath spec: the others use absolute paths that leave the base.
  ...(process.env.BASE_PATH ? { testMatch: 'subpath.spec.ts' } : {}),
  // One database is shared by every test and each test resets it, so tests run one at a time.
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    // With BASE_PATH set (only for tests/e2e/subpath.spec.ts), relative paths resolve under it.
    baseURL: `http://localhost:${PORT}${process.env.BASE_PATH ?? ''}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // The real API on Postgres, with the reset route enabled for the per-test reset fixture.
      // tsx is run through node, not pnpm, for the same reason as the preview server below.
      command: 'node node_modules/tsx/dist/cli.mjs src/server.ts',
      cwd: '../api',
      env: { PORT: String(API_PORT), DATABASE_URL, ALLOW_RESET: 'true', NODE_ENV: 'test' },
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      // E2E runs against the production build, the same artifact users get. Vite is started
      // directly, not through `pnpm preview`: on Linux (CI) the pnpm wrapper outlived Playwright's
      // shutdown and `pnpm e2e` never exited after the tests passed.
      command: `pnpm build && node node_modules/vite/bin/vite.js preview --port ${PORT} --strictPort`,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
      url: `http://localhost:${PORT}`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
})
