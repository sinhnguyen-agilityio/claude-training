// Run: node --test .claude/hooks/git-hooks.test.mjs
// Runs the husky pre-commit and pre-push hooks in throwaway repos and checks the protected-branch
// rule. Unlike block-forbidden.mjs these see the real branch, so they cannot be talked around.
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const husky = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.husky')

// Inside a git hook (the husky pre-commit) git exports GIT_INDEX_FILE and friends, which would
// point the throwaway repos at the real one. Drop them from every child process.
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
)

function git(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, env, encoding: 'utf8' })
  assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr}`)
}

const root = mkdtempSync(join(tmpdir(), 'git-hooks-'))
after(() => rmSync(root, { recursive: true, force: true }))

function makeRepo(name) {
  const dir = join(root, name)
  spawnSync('git', ['init', '-q', '-b', 'main', dir], { env })
  git(dir, 'config', 'user.email', 't@example.com')
  git(dir, 'config', 'user.name', 'test')
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'init')
  return dir
}

function runHook(name, cwd, input = '') {
  return spawnSync('sh', [join(husky, name)], { cwd, env, input, encoding: 'utf8' })
}

describe('pre-commit', () => {
  const main = makeRepo('commit-main')

  test('blocks a commit on main', () => {
    const res = runHook('pre-commit', main)
    assert.equal(res.status, 1)
    assert.match(res.stderr, /protected branch "main"/)
  })

  test('blocks a commit on master', () => {
    const dir = makeRepo('commit-master')
    git(dir, 'branch', '-m', 'master')
    const res = runHook('pre-commit', dir)
    assert.equal(res.status, 1)
    assert.match(res.stderr, /protected branch "master"/)
  })

  test('allows a commit on a feature branch', () => {
    const dir = makeRepo('commit-feat')
    git(dir, 'checkout', '-q', '-b', 'feat/x')
    assert.equal(runHook('pre-commit', dir).status, 0)
  })

  test('allows a commit on a detached HEAD', () => {
    const dir = makeRepo('commit-detached')
    git(dir, 'checkout', '-q', '--detach')
    assert.equal(runHook('pre-commit', dir).status, 0)
  })

  test('judges a linked worktree by its own branch, not the main checkout', () => {
    const worktree = join(root, 'commit-worktree')
    git(main, 'worktree', 'add', '-q', '-b', 'feat/wt', worktree)
    mkdirSync(join(worktree, 'sub'))
    assert.equal(runHook('pre-commit', worktree).status, 0)
    assert.equal(runHook('pre-commit', join(worktree, 'sub')).status, 0)
    assert.equal(runHook('pre-commit', main).status, 1)
  })
})

describe('pre-push', () => {
  const repo = makeRepo('push')
  const SHA = 'a'.repeat(40)
  const ZERO = '0'.repeat(40)
  const line = (localRef, remoteRef) => `${localRef} ${SHA} ${remoteRef} ${ZERO}\n`

  test('blocks pushing to main', () => {
    const res = runHook('pre-push', repo, line('refs/heads/feat/x', 'refs/heads/main'))
    assert.equal(res.status, 1)
    assert.match(res.stderr, /protected branch "main"/)
  })

  test('blocks pushing to master', () => {
    assert.equal(runHook('pre-push', repo, line('refs/heads/x', 'refs/heads/master')).status, 1)
  })

  test('blocks pushing HEAD to main, by the remote ref', () => {
    assert.equal(runHook('pre-push', repo, line('HEAD', 'refs/heads/main')).status, 1)
  })

  test('blocks deleting main', () => {
    const res = runHook('pre-push', repo, `(delete) ${ZERO} refs/heads/main ${SHA}\n`)
    assert.equal(res.status, 1)
  })

  test('blocks when one of several refs is protected', () => {
    const input = line('refs/heads/a', 'refs/heads/a') + line('refs/heads/b', 'refs/heads/main')
    assert.equal(runHook('pre-push', repo, input).status, 1)
  })

  test('allows a feature branch, tags and look-alike names', () => {
    for (const remoteRef of [
      'refs/heads/feat/x',
      'refs/heads/maintenance',
      'refs/heads/main-backup',
      'refs/tags/main',
    ]) {
      assert.equal(runHook('pre-push', repo, line('HEAD', remoteRef)).status, 0, remoteRef)
    }
  })

  test('allows an empty push', () => {
    assert.equal(runHook('pre-push', repo, '').status, 0)
  })
})
