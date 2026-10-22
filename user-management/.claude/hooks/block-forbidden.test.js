// Run: node .claude/hooks/block-forbidden.test.js
// Spawns the real hook against throwaway git repos and prints case / expected / actual exit codes.
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const hook = join(dirname(fileURLToPath(import.meta.url)), 'block-forbidden.js')

function git(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (res.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${res.stderr}`)
}

const root = mkdtempSync(join(tmpdir(), 'block-forbidden-'))
function makeRepo(name, setup) {
  const dir = join(root, name)
  spawnSync('git', ['init', '-q', '-b', 'main', dir])
  git(dir, 'config', 'user.email', 't@example.com')
  git(dir, 'config', 'user.name', 'test')
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'init')
  setup?.(dir)
  return dir
}

const dirs = {
  main: makeRepo('main'),
  master: makeRepo('master', (d) => git(d, 'branch', '-m', 'master')),
  feat: makeRepo('feat', (d) => git(d, 'checkout', '-q', '-b', 'feat/x')),
  detached: makeRepo('detached', (d) => git(d, 'checkout', '-q', '--detach')),
  norepo: join(root, 'norepo'), // not a git repo; created below
}
mkdirSync(dirs.norepo)

const BLOCK = 2
const ALLOW = 0
const cmd = (command) => JSON.stringify({ tool_input: { command } })

// [case name, stdin, project dir key, expected exit code]
const cases = [
  // Destructive
  ['push --force', cmd('git push --force'), 'feat', BLOCK],
  ['push -f', cmd('git push -f'), 'feat', BLOCK],
  ['push -fu (combined)', cmd('git push -fu origin feat/x'), 'feat', BLOCK],
  ['push origin -f (flag after remote)', cmd('git push origin -f'), 'feat', BLOCK],
  ['-c ... push --force (global opt)', cmd('git -c core.x=1 push --force'), 'feat', BLOCK],
  ['-C dir push --force', cmd('git -C some/dir push --force'), 'feat', BLOCK],
  [
    '--force + --force-with-lease',
    cmd('git push --force --force-with-lease origin feat/x'),
    'feat',
    BLOCK,
  ],
  ['push --force-with-lease', cmd('git push --force-with-lease origin feat/x'), 'feat', ALLOW],
  ['reset --hard', cmd('git reset --hard'), 'feat', BLOCK],
  ['reset --soft', cmd('git reset --soft HEAD~1'), 'feat', ALLOW],
  ['clean -f', cmd('git clean -f'), 'feat', BLOCK],
  ['clean -fd', cmd('git clean -fd'), 'feat', BLOCK],
  ['clean -fdx', cmd('git clean -fdx'), 'feat', BLOCK],
  ['clean -xdf', cmd('git clean -xdf'), 'feat', BLOCK],
  ['clean -n', cmd('git clean -n'), 'feat', ALLOW],
  ['clean --dry-run', cmd('git clean --dry-run'), 'feat', ALLOW],
  ['checkout .', cmd('git checkout .'), 'feat', BLOCK],
  ['checkout branch', cmd('git checkout feat/y'), 'feat', ALLOW],
  ['restore .', cmd('git restore .'), 'feat', BLOCK],
  ['restore file', cmd('git restore src/a.ts'), 'feat', ALLOW],
  // Bypass
  ['commit --no-verify', cmd('git commit --no-verify -m "x"'), 'feat', BLOCK],
  ['commit --no-gpg-sign', cmd('git commit --no-gpg-sign -m "x"'), 'feat', BLOCK],
  ['-c commit.gpgsign=false', cmd('git -c commit.gpgsign=false commit -m "x"'), 'feat', BLOCK],
  ['echo "--no-verify" (not git)', cmd('echo "--no-verify"'), 'feat', ALLOW],
  ['plain commit on feature', cmd('git commit -m "x"'), 'feat', ALLOW],
  // Protected branch
  ['commit on main', cmd('git commit -m "x"'), 'main', BLOCK],
  ['commit on master', cmd('git commit -m "x"'), 'master', BLOCK],
  ['push origin main', cmd('git push origin main'), 'feat', BLOCK],
  ['push origin HEAD:main', cmd('git push origin HEAD:main'), 'feat', BLOCK],
  ['push origin master', cmd('git push origin master'), 'feat', BLOCK],
  ['bare push on main', cmd('git push'), 'main', BLOCK],
  ['bare push on master', cmd('git push'), 'master', BLOCK],
  ['bare push on feature', cmd('git push'), 'feat', ALLOW],
  ['push feature branch', cmd('git push -u origin feat/x'), 'main', ALLOW],
  // Chaining + git.exe
  ['chain &&', cmd('cd src && git push --force'), 'feat', BLOCK],
  ['chain ;', cmd('cd src; git reset --hard'), 'feat', BLOCK],
  ['chain |', cmd('echo hi | git clean -fd'), 'feat', BLOCK],
  ['chain ||', cmd('false || git push -f'), 'feat', BLOCK],
  ['git.exe reset --hard', cmd('git.exe reset --hard'), 'feat', BLOCK],
  // Everyday commands
  ['pnpm dev', cmd('pnpm dev'), 'main', ALLOW],
  ['pnpm build', cmd('pnpm build'), 'main', ALLOW],
  ['pnpm test', cmd('pnpm test'), 'main', ALLOW],
  ['pnpm lint && pnpm format', cmd('pnpm lint && pnpm format'), 'main', ALLOW],
  ['git status', cmd('git status'), 'main', ALLOW],
  ['git add .', cmd('git add .'), 'main', ALLOW],
  ['git diff', cmd('git diff'), 'main', ALLOW],
  ['git log --oneline', cmd('git log --oneline | head'), 'main', ALLOW],
  // Fail-closed
  ['empty stdin', '', 'feat', BLOCK],
  ['malformed JSON', '{not json', 'feat', BLOCK],
  ['missing command', JSON.stringify({ tool_input: {} }), 'feat', BLOCK],
  ['branch unreadable: pnpm test', cmd('pnpm test'), 'norepo', ALLOW],
  ['branch unreadable: git status', cmd('git status'), 'norepo', ALLOW],
  ['branch unreadable: git commit', cmd('git commit -m "x"'), 'norepo', BLOCK],
  ['branch unreadable: bare push', cmd('git push'), 'norepo', BLOCK],
  ['detached HEAD: git commit', cmd('git commit -m "x"'), 'detached', BLOCK],
  ['detached HEAD: pnpm test', cmd('pnpm test'), 'detached', ALLOW],
]

const rows = cases.map(([name, input, dirKey, expected]) => {
  const res = spawnSync(process.execPath, [hook], {
    input,
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: dirs[dirKey] },
  })
  const ok = res.status === expected
  return {
    case: name,
    expected,
    actual: res.status,
    result: ok ? 'PASS' : 'FAIL',
    stderr: res.stderr,
  }
})

console.table(rows.map(({ stderr, ...row }) => row))
const failed = rows.filter((r) => r.result === 'FAIL')
for (const r of failed) console.error(`FAIL ${r.case}: ${r.stderr.trim()}`)
console.log(`${rows.length - failed.length}/${rows.length} passed`)

// Blocked cases must explain themselves on stderr.
const silent = rows.filter((r) => r.actual === BLOCK && !r.stderr.trim())
if (silent.length) console.error(`Blocked without a message: ${silent.map((r) => r.case)}`)

rmSync(root, { recursive: true, force: true })
process.exit(failed.length || silent.length ? 1 : 0)
