// Run: node --test .claude/hooks/git-hooks.test.mjs
// Runs the husky pre-commit, commit-msg and pre-push hooks in throwaway repos and checks the
// protected-branch rule, the commit message rule and the branch name rule. Unlike
// block-forbidden.mjs these see the real branch, so they cannot be talked around.
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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

function runHook(name, cwd, input = '', args = []) {
  return spawnSync('sh', [join(husky, name), ...args], { cwd, env, input, encoding: 'utf8' })
}

// git passes the path of the message file to commit-msg.
function runCommitMsg(message) {
  const file = join(root, 'COMMIT_EDITMSG')
  writeFileSync(file, message)
  return runHook('commit-msg', root, '', [file])
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
      'refs/heads/feat/1-x',
      'refs/heads/chore/2-maintenance',
      'refs/heads/chore/3-main-backup',
      'refs/tags/main',
    ]) {
      assert.equal(runHook('pre-push', repo, line('HEAD', remoteRef)).status, 0, remoteRef)
    }
  })

  test('allows an empty push', () => {
    assert.equal(runHook('pre-push', repo, '').status, 0)
  })

  test('allows a branch that matches the naming convention (AC7)', () => {
    const res = runHook('pre-push', repo, line('HEAD', 'refs/heads/feat/12-add-export'))
    assert.equal(res.status, 0, res.stderr)
  })

  test('rejects a branch that breaks the naming convention (AC7)', () => {
    for (const name of ['feat/workflow', 'Feature/12-x', 'chore/12-a-b-c-d-e-f']) {
      const res = runHook('pre-push', repo, line('HEAD', `refs/heads/${name}`))
      assert.equal(res.status, 1, name)
      assert.match(res.stderr, /\^\(feat\|fix/, 'shows the regex')
      assert.match(res.stderr, /feat\/12-add-export/, 'shows an example')
    }
  })

  test('judges the remote ref, not the local one (AC7)', () => {
    assert.equal(runHook('pre-push', repo, line('refs/heads/feat/12-x', 'refs/heads/oops')).status, 1)
  })

  test('exempts claude/ and dependabot/ branches (A3)', () => {
    for (const name of ['claude/new-session-aa58c4', 'dependabot/npm_and_yarn/x-1']) {
      assert.equal(runHook('pre-push', repo, line('HEAD', `refs/heads/${name}`)).status, 0, name)
    }
  })

  test('does not check tags (A8)', () => {
    assert.equal(runHook('pre-push', repo, line('refs/tags/v1.2.0', 'refs/tags/v1.2.0')).status, 0)
  })

  test('lets a branch deletion through, but still blocks deleting main (A9)', () => {
    const del = (ref) => `(delete) ${ZERO} ${ref} ${SHA}\n`
    assert.equal(runHook('pre-push', repo, del('refs/heads/feat/workflow')).status, 0)
    assert.equal(runHook('pre-push', repo, del('refs/heads/main')).status, 1)
  })

  test('still blocks main when the same push has a good branch', () => {
    const input = line('HEAD', 'refs/heads/feat/12-x') + line('HEAD', 'refs/heads/main')
    assert.equal(runHook('pre-push', repo, input).status, 1)
  })
})

describe('commit-msg', () => {
  test('creates the commit for a valid header, with SPEC and issue tags (AC2)', () => {
    for (const msg of ['feat: add export (F8)\n', 'chore: tidy hooks (#32)\n']) {
      const res = runCommitMsg(msg)
      assert.equal(res.status, 0, res.stderr)
    }
  })

  test('rejects a bad header with exit code 1 and a message that names the rule (AC3)', () => {
    for (const msg of ['Fix stuff\n', 'feature: x\n', 'feat:x\n', 'feat: \n']) {
      const res = runCommitMsg(msg)
      assert.equal(res.status, 1, msg)
      assert.match(res.stderr, /feat: add export/, 'shows a valid example')
    }
  })

  test('rejects a 73-character header, a capital and a trailing period (AC4)', () => {
    for (const msg of [`feat: ${'a'.repeat(67)}\n`, 'feat: Add export\n', 'feat: add export.\n']) {
      assert.equal(runCommitMsg(msg).status, 1, msg)
    }
    assert.equal(runCommitMsg(`feat: ${'a'.repeat(66)}\n`).status, 0, '72 characters pass')
  })

  test('needs a blank line before the body (AC5)', () => {
    assert.equal(runCommitMsg('feat: add export\nbody\n').status, 1)
    assert.equal(runCommitMsg(`feat: add export\n\n${'long '.repeat(40)}\n`).status, 0)
  })

  test('lets git-generated messages through (AC6)', () => {
    for (const msg of ['Merge branch x\n', 'Revert "feat: x"\n', 'fixup! feat: x\n', 'squash! feat: x\n']) {
      assert.equal(runCommitMsg(msg).status, 0, msg)
    }
  })

  test('rejects a real `git commit` through the installed hook (AC3)', () => {
    const dir = makeRepo('commit-msg-real')
    git(dir, 'checkout', '-q', '-b', 'feat/1-x')
    // What husky's generated wrapper does: run the script with the message file as its argument.
    const hook = join(dir, '.git', 'hooks', 'commit-msg')
    writeFileSync(hook, `#!/bin/sh\nexec sh "${husky.replaceAll('\\', '/')}/commit-msg" "$@"\n`)
    chmodSync(hook, 0o755)
    const run = (message) =>
      spawnSync('git', ['commit', '-q', '--allow-empty', '-m', message], {
        cwd: dir,
        env,
        encoding: 'utf8',
      })
    assert.equal(run('Fix stuff').status, 1)
    assert.equal(run('feat: add export (F8)').status, 0)
  })
})
