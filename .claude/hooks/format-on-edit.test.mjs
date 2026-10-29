// Run: node --test .claude/hooks/format-on-edit.test.mjs
// Path cases spawn the real hook with --test-dry-run and check which file it would format.
// The real-format cases point --test-root-dir at a unique temp folder, so they never write
// into the repo. They need Prettier installed (`pnpm install`).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  symlinkSync,
  realpathSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const hooksDir = dirname(fileURLToPath(import.meta.url))
const hook = join(hooksDir, 'format-on-edit.mjs')
// Real path, as the hook resolves it, so a checkout reached through a symlink still compares equal.
const repo = realpathSync.native(resolve(hooksDir, '..', '..'))
const rootDir = repo

function run(input, flags = ['--test-dry-run']) {
  const res = spawnSync(process.execPath, [hook, ...flags], { input, encoding: 'utf8' })
  let out = null
  try {
    out = JSON.parse(res.stdout)
  } catch {
    // not JSON: leaves out = null
  }
  return { status: res.status, stdout: res.stdout, stderr: res.stderr, out }
}

const edit = (file_path, cwd) => JSON.stringify({ cwd, tool_input: { file_path } })

function assertPlans(r, file) {
  assert.equal(r.status, 0, r.stderr)
  assert.deepEqual(r.out, { rootDir, file })
}

function assertSilent(r) {
  assert.deepEqual(
    { status: r.status, stdout: r.stdout, stderr: r.stderr },
    { status: 0, stdout: '', stderr: '' },
  )
}

// Runs fn(dir) with a fresh temp folder that is always removed afterwards.
function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'prettier-hook-'))
  try {
    return fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('file in the repo', () => {
  const file = join(rootDir, 'src', 'a.ts')
  assertPlans(run(edit(file)), file)
})

test('spaces and shell characters in the path', () => {
  const file = join(rootDir, 'src', 'my file&$(x).ts')
  assertPlans(run(edit(file)), file)
})

test('name starting with two dots is still inside', () => {
  const file = join(rootDir, '..notes.md')
  assertPlans(run(edit(file)), file)
})

test('relative path uses the session cwd', () => {
  assertPlans(run(edit(join('src', 'a.ts'), rootDir)), join(rootDir, 'src', 'a.ts'))
})

test('file reached through a junction or symlink', () =>
  withTempDir((dir) => {
    const link = join(dir, 'link')
    symlinkSync(rootDir, link, 'junction')
    assertPlans(run(edit(join(link, 'package.json'))), join(rootDir, 'package.json'))
  }))

test('file outside the repo', () =>
  assertSilent(run(edit(join(dirname(repo), 'elsewhere', 'a.ts')))))
test('sibling folder with the same prefix', () => assertSilent(run(edit(join(`${repo}2`, 'a.ts')))))
test('missing file_path', () => assertSilent(run('{"tool_input":{}}')))
test('empty stdin', () => assertSilent(run('')))
test('malformed JSON', () => assertSilent(run('{not json')))

test('loader argv (<script> <failCode>) is ignored', () => {
  const file = join(rootDir, 'src', 'a.ts')
  assertPlans(run(edit(file), ['.claude/hooks/format-on-edit.mjs', '1', '--test-dry-run']), file)
})

test('formats a real file with the nearest Prettier config', () =>
  withTempDir((dir) => {
    const file = join(dir, 'a.ts')
    writeFileSync(join(dir, '.prettierrc'), '{ "semi": false, "singleQuote": true }\n')
    writeFileSync(file, 'const   a="x";;\n')
    assertSilent(run(edit(file), [`--test-root-dir=${dir}`]))
    assert.equal(readFileSync(file, 'utf8'), "const a = 'x'\n")
  }))

test('applies .editorconfig like the Prettier CLI', () =>
  withTempDir((dir) => {
    const file = join(dir, 'a.ts')
    writeFileSync(
      join(dir, '.editorconfig'),
      'root = true\n[*]\nindent_style = space\nindent_size = 4\n',
    )
    writeFileSync(file, 'if (a) {\nb()\n}\n')
    assertSilent(run(edit(file), [`--test-root-dir=${dir}`]))
    assert.equal(readFileSync(file, 'utf8'), 'if (a) {\n    b();\n}\n')
  }))

test('skips files with no Prettier parser', () =>
  withTempDir((dir) => {
    const file = join(dir, 'notes.unknownext')
    writeFileSync(file, 'a=1;;  \n')
    assertSilent(run(edit(file), [`--test-root-dir=${dir}`]))
    assert.equal(readFileSync(file, 'utf8'), 'a=1;;  \n')
  }))

test('skips files listed in .prettierignore', () =>
  withTempDir((dir) => {
    const file = join(dir, 'generated.ts')
    writeFileSync(join(dir, '.prettierignore'), 'generated.ts\n')
    writeFileSync(file, 'const   a=1;;\n')
    assertSilent(run(edit(file), [`--test-root-dir=${dir}`]))
    assert.equal(readFileSync(file, 'utf8'), 'const   a=1;;\n')
  }))

test('reports why Prettier failed', () =>
  withTempDir((dir) => {
    const file = join(dir, 'broken.ts')
    writeFileSync(file, 'const = ;\n')
    const r = run(edit(file), [`--test-root-dir=${dir}`])
    assert.equal(r.status, 1)
    assert.match(r.stderr, /could not format broken\.ts \(.*\S.*\)/s)
  }))
