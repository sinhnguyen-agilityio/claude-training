// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const webRoot = fileURLToPath(new URL('../..', import.meta.url))
const srcRoot = join(webRoot, 'src')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : [path]
  })
}

// MSW is allowed in tests, in src/test, and in the two node-server-only mock files (assumption A3:
// handlers.ts holds the handlers that mocks/node.ts serves to Vitest).
const allowed = (file: string) => {
  const rel = relative(srcRoot, file).split(sep).join('/')
  return (
    /\.test\.[tj]sx?$/.test(rel) ||
    rel.startsWith('test/') ||
    rel === 'mocks/node.ts' ||
    rel === 'mocks/handlers.ts'
  )
}

describe('no MSW in the browser bundle (SPEC §2, AC2)', () => {
  it('imports msw only from tests, src/test, mocks/node.ts and mocks/handlers.ts', () => {
    const offenders = sourceFiles(srcRoot)
      .filter((file) => /\.[tj]sx?$/.test(file) && !allowed(file))
      .filter((file) => /from\s+['"]msw(\/|['"])/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(srcRoot, file))

    expect(offenders).toEqual([])
  })

  it('has no browser worker and no service worker script', () => {
    expect(existsSync(join(srcRoot, 'mocks/browser.ts'))).toBe(false)
    expect(existsSync(join(webRoot, 'public/mockServiceWorker.js'))).toBe(false)
  })

  it('main.tsx does not start a worker', () => {
    expect(readFileSync(join(srcRoot, 'main.tsx'), 'utf8')).not.toMatch(/startMocks|mocks\/browser/)
  })
})
