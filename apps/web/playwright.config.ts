import { defineConfig, devices } from '@playwright/test'

import { resolveE2eEnv } from './e2e-env.ts'

// E2E_PORT lets two worktrees run E2E at once, each on its own port. E2E_API_PORT and E2E_DATABASE_URL
// (required) are read the same way; see e2e-env.ts.
const { port: PORT, apiPort: API_PORT, databaseUrl: DATABASE_URL } = resolveE2eEnv(process.env)

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
      // Never reuse a server already on this port: another worktree's preview would carry its own
      // API_PROXY_TARGET, so this run would hit that API and reset that database. A busy port fails
      // the run instead; pick another with E2E_PORT.
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
