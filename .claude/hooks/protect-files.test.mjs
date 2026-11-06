// Run: node --test .claude/hooks/protect-files.test.mjs
// Spawns the real hook with a tool call on stdin and checks the exit code.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const hooksDir = dirname(fileURLToPath(import.meta.url))
const hook = join(hooksDir, 'protect-files.mjs')
const repo = resolve(hooksDir, '..', '..')

const run = (tool_input, raw) =>
  spawnSync(process.execPath, [hook], {
    input: raw ?? JSON.stringify({ cwd: repo, tool_input }),
    encoding: 'utf8',
  })

test('blocks pnpm-lock.yaml', () => {
  const r = run({ file_path: join(repo, 'pnpm-lock.yaml'), content: 'x' })
  assert.equal(r.status, 2)
  assert.match(r.stderr, /pnpm-lock\.yaml/)
})

test('blocks the seed users, also via a relative path', () => {
  assert.equal(run({ file_path: 'packages/shared/src/seed.ts', new_string: 'x' }).status, 2)
})

test('blocks a coverage threshold edit in vite.config.ts', () => {
  const r = run({
    file_path: join(repo, 'apps/web/vite.config.ts'),
    old_string: 'lines: 80',
    new_string: 'lines: 70',
  })
  assert.equal(r.status, 0, 'no `thresholds` word in the edit: allowed')
  const t = run({
    file_path: join(repo, 'apps/web/vite.config.ts'),
    old_string: 'thresholds: { lines: 80 }',
    new_string: 'thresholds: { lines: 70 }',
  })
  assert.equal(t.status, 2)
})

test('blocks a coverage threshold edit in the api vitest.config.ts', () => {
  const r = run({
    file_path: join(repo, 'apps/api/vitest.config.ts'),
    old_string: 'thresholds: { lines: 80 }',
    new_string: 'thresholds: { lines: 70 }',
  })
  assert.equal(r.status, 2)
  assert.equal(run({ file_path: join(repo, 'apps/api/vitest.config.ts'), new_string: 'x' }).status, 0)
})

test('blocks a MultiEdit that touches thresholds', () => {
  const r = run({
    file_path: join(repo, 'apps/web/vite.config.ts'),
    edits: [{ old_string: 'a', new_string: 'thresholds: {}' }],
  })
  assert.equal(r.status, 2)
})

test('allows other edits to vite.config.ts and ordinary files', () => {
  assert.equal(run({ file_path: join(repo, 'apps/web/vite.config.ts'), new_string: 'port: 1' }).status, 0)
  assert.equal(run({ file_path: join(repo, 'apps/web/src/main.tsx'), new_string: 'x' }).status, 0)
})

test('allows files outside the repo and ignores bad input', () => {
  assert.equal(run({ file_path: join(repo, '..', 'other', 'pnpm-lock.yaml') }).status, 0)
  assert.equal(run({}, 'not json').status, 0)
  assert.equal(run({ command: 'ls' }).status, 0)
})
