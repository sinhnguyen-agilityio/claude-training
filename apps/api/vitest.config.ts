import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // server.ts only calls listen; the app it starts is covered through createApp().
      exclude: ['src/**/*.test.ts', 'src/server.ts'],
      reporter: ['text', 'html'],
      // Same 80% floor as the web app (SPEC §6).
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
})
