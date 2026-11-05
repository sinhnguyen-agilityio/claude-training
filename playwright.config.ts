import { defineConfig, devices } from '@playwright/test'

// E2E_PORT lets two worktrees run E2E at once. With one fixed port, reuseExistingServer below
// would make the second run test the first worktree's build.
// An empty or non-numeric value falls back to the default instead of becoming port 0 or NaN.
const PORT = Number(process.env.E2E_PORT) || 4173

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // E2E runs against the production build, the same artifact users get.
  webServer: {
    // Vite is started directly, not through `pnpm preview`: on Linux (CI) the pnpm wrapper outlived
    // Playwright's shutdown and `pnpm e2e` never exited after the tests passed.
    command: `pnpm build && node node_modules/vite/bin/vite.js preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
