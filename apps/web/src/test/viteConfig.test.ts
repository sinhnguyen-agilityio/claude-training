// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

// AC1: the dev and preview servers proxy /api to the API, so the browser never makes a cross-origin call.
async function loadConfig() {
  vi.resetModules()
  const { default: config } = await import('../../vite.config')
  return config
}

describe('vite.config.ts /api proxy', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(['server', 'preview'] as const)(
    '%s proxies /api to localhost:3001 by default',
    async (mode) => {
      vi.stubEnv('API_PROXY_TARGET', '')
      const config = await loadConfig()

      expect(config[mode]?.proxy?.['/api']).toMatchObject({ target: 'http://localhost:3001' })
    },
  )

  it.each(['server', 'preview'] as const)('%s honours API_PROXY_TARGET', async (mode) => {
    vi.stubEnv('API_PROXY_TARGET', 'http://localhost:3999')
    const config = await loadConfig()

    expect(config[mode]?.proxy?.['/api']).toMatchObject({ target: 'http://localhost:3999' })
  })
})
