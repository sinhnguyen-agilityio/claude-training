import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// The browser only ever calls same-origin /api. Both servers forward it to the Express API, so there
// is no CORS. API_PROXY_TARGET points them at another API (the E2E run uses it); an empty value
// counts as unset. The proxy does not apply to a static `dist/` served without Vite.
const apiProxy = {
  '/api': { target: process.env.API_PROXY_TARGET?.trim() || 'http://localhost:3001' },
}

// https://vite.dev/config/
export default defineConfig({
  // BASE_PATH is set by the Deploy workflow (GitHub Pages serves the app under /claude-training/)
  // and by the CI step that runs tests/e2e/subpath.spec.ts. Everything else builds for the site root.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      // The shared package sits outside the web root, so it needs allowExternal to be counted.
      allowExternal: true,
      include: ['src/**/*.{ts,tsx}', '../../packages/shared/src/**/*.ts'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/**/*.d.ts'],
      reporter: ['text', 'html'],
      // SPEC §6: unit/component coverage must stay at or above 80%.
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
})
