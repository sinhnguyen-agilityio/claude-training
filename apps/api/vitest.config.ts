import { defineConfig } from 'vitest/config'

// The package scripts read the repo .env (--env-file-if-exists); the tests should connect to the
// same database, for example when DB_PORT is changed there. A variable that is already set wins.
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url))
} catch {
  // No .env: createTestDb() falls back to the defaults of .env.example.
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // server.ts and the *.cli.ts files only call code that is tested elsewhere (createApp(),
      // runMigrations(), seedDatabase()). src/test holds the test helpers.
      exclude: ['src/**/*.test.ts', 'src/server.ts', 'src/db/*.cli.ts', 'src/test/**'],
      reporter: ['text', 'html'],
      // Same 80% floor as the web app (SPEC §6).
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
})
