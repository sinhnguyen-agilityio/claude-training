import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from './fixtures.js'

// AC4: the webServer command runs `pnpm build` before this, so dist/ is the production build.
const dist = join(process.cwd(), 'dist')

test('AC4: the production build ships no mock service worker', () => {
  expect(existsSync(join(dist, 'mockServiceWorker.js'))).toBe(false)

  const assets = join(dist, 'assets')
  const bundles = readdirSync(assets).filter((file) => file.endsWith('.js'))
  expect(bundles.length).toBeGreaterThan(0)
  for (const file of bundles) {
    expect(readFileSync(join(assets, file), 'utf8').toLowerCase(), file).not.toContain('msw')
  }
})
