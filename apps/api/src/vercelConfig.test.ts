import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const repoRoot = new URL('../../../', import.meta.url)

interface VercelConfig {
  buildCommand?: string
  outputDirectory?: string
  regions?: string[]
  git?: { deploymentEnabled?: boolean }
  env?: unknown
  rewrites?: { source: string; destination: string }[]
}

const config = JSON.parse(readFileSync(new URL('vercel.json', repoRoot), 'utf8')) as VercelConfig

describe('vercel.json (SPEC §4, #48 AC1 and AC6)', () => {
  it('builds apps/web and serves apps/web/dist', () => {
    expect(config.buildCommand).toContain('pnpm --filter @app/web build')
    expect(config.buildCommand).toContain('pnpm api:bundle')
    expect(config.outputDirectory).toBe('apps/web/dist')
  })

  it('rewrites /api/(.*) to the function before the SPA fallback', () => {
    expect(config.rewrites).toEqual([
      { source: '/api/(.*)', destination: '/api' },
      { source: '/(.*)', destination: '/index.html' },
    ])
  })

  it('runs in sin1 and leaves Git deploys to GitHub Actions', () => {
    expect(config.regions).toEqual(['sin1'])
    expect(config.git?.deploymentEnabled).toBe(false)
  })

  it('has the function entry that re-exports the bundle', () => {
    const entry = readFileSync(new URL('api/index.mjs', repoRoot), 'utf8')

    expect(entry).toContain("export { default } from '../apps/api/dist/vercel.mjs'")
  })
})

describe('no database secret in the repository (#48 AC5)', () => {
  it('vercel.json sets no env values', () => {
    expect(config.env).toBeUndefined()
  })

  it('no tracked file holds a connection string for a host other than localhost or a placeholder', () => {
    const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], {
      cwd: repoRoot,
      encoding: 'utf8',
    })
      .split('\n')
      .filter((file) => file && !file.endsWith('pnpm-lock.yaml') && !file.endsWith('.png'))
    const url = /postgres(?:ql)?:\/\/[^:\s/]+:[^@\s]+@([^/:\s?]+)/g
    const allowed = new Set(['localhost', '127.0.0.1', 'host', 'host-pooler.region.aws.neon.tech'])
    // Hosts that cannot be a real database: local, placeholders, a template slot, example.com.
    const isHarmless = (host: string) =>
      allowed.has(host.toLowerCase()) ||
      host.startsWith('placeholder') ||
      host.startsWith('${') ||
      host.endsWith('example.com')
    const found: string[] = []

    for (const file of files) {
      let text: string
      try {
        text = readFileSync(new URL(file, repoRoot), 'utf8')
      } catch {
        continue
      }
      for (const match of text.matchAll(url)) {
        const host = match[1] ?? ''
        if (!isHarmless(host)) found.push(`${file}: ${host}`)
      }
    }

    expect(found).toEqual([])
  })
})
