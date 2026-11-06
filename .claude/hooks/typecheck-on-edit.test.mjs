// Run: node --test .claude/hooks/typecheck-on-edit.test.mjs
// Uses --test-dry-run, so tsc itself is not run: only which edits trigger a type-check.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const hooksDir = dirname(fileURLToPath(import.meta.url))
const hook = join(hooksDir, 'typecheck-on-edit.mjs')
const repo = resolve(hooksDir, '..', '..')

const run = (file_path, raw) => {
  const res = spawnSync(process.execPath, [hook, '--test-dry-run'], {
    input: raw ?? JSON.stringify({ cwd: repo, tool_input: { file_path } }),
    encoding: 'utf8',
  })
  return { status: res.status, ran: res.stdout.includes('"run":true') }
}

test('runs for .ts and .tsx files in the repo', () => {
  assert.deepEqual(run(join(repo, 'src', 'main.tsx')), { status: 0, ran: true })
  assert.deepEqual(run('src/shared/x.ts'), { status: 0, ran: true })
})

test('skips other files, files outside the repo and node_modules', () => {
  assert.equal(run(join(repo, 'README.md')).ran, false)
  assert.equal(run(join(repo, '..', 'other', 'a.ts')).ran, false)
  assert.equal(run(join(repo, 'node_modules', 'x', 'a.ts')).ran, false)
})

test('ignores malformed input', () => {
  assert.deepEqual(run(undefined, 'not json'), { status: 0, ran: false })
})
