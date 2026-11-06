// PostToolUse hook (matcher: Edit|MultiEdit|Write): type-checks the project after Claude edits a
// .ts or .tsx file in this repository, so a type error shows up at edit time, not at /ship.
// Runs `tsc -b` (what `pnpm typecheck` runs) with the repo's TypeScript, no shell.
// Exit 2 with the errors on stderr is fed back to Claude (the edit is already applied). Anything
// that is not a type error (TypeScript missing, timeout) exits 1, a non-blocking error.
// Test-only flag (argv): --test-dry-run prints whether it would run, as JSON, instead of running.
import { readFileSync, existsSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const MAX_LINES = 40
const TIMEOUT_MS = 120_000

const realPath = (p) => {
  try {
    return realpathSync.native(p)
  } catch {
    return path.resolve(p)
  }
}

const repoRoot = realPath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'))
const tscEntry = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc')

let input
try {
  input = JSON.parse(readFileSync(0, 'utf8'))
} catch {
  process.exit(0)
}

const file = input?.tool_input?.file_path
if (typeof file !== 'string' || !/\.(ts|tsx)$/.test(file)) process.exit(0)

const abs = realPath(path.resolve(input.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), file))
const rel = path.relative(repoRoot, abs)
if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) process.exit(0)
if (rel.split(path.sep).includes('node_modules')) process.exit(0)

if (process.argv.includes('--test-dry-run')) {
  console.log(JSON.stringify({ repoRoot, file: abs, run: true }))
  process.exit(0)
}

if (!existsSync(tscEntry)) {
  console.error('typecheck-on-edit hook: TypeScript is not installed. Run `pnpm install` first.')
  process.exit(1)
}

const res = spawnSync(process.execPath, [tscEntry, '-b'], {
  cwd: repoRoot,
  encoding: 'utf8',
  timeout: TIMEOUT_MS,
})
if (res.error) {
  console.error(`typecheck-on-edit hook: could not run tsc (${res.error.message})`)
  process.exit(1)
}
if (res.status === 0) process.exit(0)

const lines = `${res.stdout}${res.stderr}`.trim().split('\n')
const shown = lines.slice(0, MAX_LINES).join('\n')
const more = lines.length > MAX_LINES ? `\n... ${lines.length - MAX_LINES} more lines` : ''
console.error(`tsc -b found type errors after editing ${rel}:\n${shown}${more}`)
process.exit(2)
