// Run: node .claude/hooks/notify-on-finish.test.mjs
// Spawns the real hook with NOTIFY_DRY_RUN=1 and prints case / result. No real toast is shown.
import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const hook = join(dirname(fileURLToPath(import.meta.url)), 'notify-on-finish.mjs')

// Preload that fakes a non-Windows platform for the child process.
const FAKE_LINUX =
  "data:text/javascript,Object.defineProperty(process,'platform',{value:'linux'})"

function run(input, { platform } = {}) {
  const nodeArgs = platform === 'linux' ? ['--import', FAKE_LINUX, hook] : [hook]
  const res = spawnSync(process.execPath, nodeArgs, {
    input,
    encoding: 'utf8',
    env: { ...process.env, NOTIFY_DRY_RUN: '1' },
  })
  let out = null
  try {
    out = JSON.parse(res.stdout)
  } catch {
    // not JSON: leaves out = null
  }
  return { status: res.status, stdout: res.stdout, stderr: res.stderr, out }
}

const isWin = process.platform === 'win32'
const BS = '\\'
const weirdName = 'a&b|c;d$e`f"g\'h(i)'
const weird = `C:${BS}x${BS}${weirdName}`
const cwd = (c) => JSON.stringify({ cwd: c })
const silent = (r) => r.status === 0 && r.stdout === '' && r.stderr === ''

// [case name, check(result) -> boolean]. Windows-only cases are skipped elsewhere.
const cases = [
  [
    'valid input',
    () => run(cwd(`C:${BS}x${BS}demo`)),
    (r) =>
      r.status === 0 &&
      r.out?.title === 'Claude Code' &&
      r.out?.body === 'Done: demo' &&
      r.out?.command === 'powershell.exe' &&
      r.out?.args.slice(0, 5).join(' ') === '-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command',
    true,
  ],
  ['trailing slash in cwd', () => run(cwd(`C:${BS}x${BS}demo${BS}`)), (r) => r.out?.body === 'Done: demo', true],
  [
    'special characters in folder name',
    () => run(cwd(weird)),
    (r) =>
      r.status === 0 &&
      r.out?.body === `Done: ${weirdName}` &&
      !r.out.args.join(' ').includes('a&b'), // text never lands in the command
    true,
  ],
  ['missing cwd still notifies', () => run('{}'), (r) => r.status === 0 && r.out?.body === 'Done', true],
  ['empty stdin', () => run(''), silent, true],
  ['malformed JSON', () => run('{not json'), silent, true],
  ['non-windows platform', () => run(cwd(`C:${BS}x${BS}demo`), { platform: 'linux' }), silent, false],
]

const rows = cases.map(([name, exec, check, winOnly]) => {
  if (winOnly && !isWin) return { case: name, result: 'SKIP' }
  const r = exec()
  return { case: name, exit: r.status, result: check(r) ? 'PASS' : 'FAIL', detail: r.stdout + r.stderr }
})

console.table(rows.map(({ detail, ...row }) => row))
const failed = rows.filter((r) => r.result === 'FAIL')
for (const r of failed) console.error(`FAIL ${r.case}: ${r.detail.trim()}`)
console.log(`${rows.filter((r) => r.result === 'PASS').length}/${rows.length} passed`)
process.exit(failed.length ? 1 : 0)
