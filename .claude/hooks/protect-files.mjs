// PreToolUse hook (matcher: Edit|MultiEdit|Write): blocks edits to files CLAUDE.md protects.
// Reads the tool call JSON from stdin. Exit 2 + reason on stderr blocks the edit; exit 0 allows.
// To protect another file, add a rule to RULES below — no logic changes.
//   - pnpm-lock.yaml: changed by pnpm only.
//   - packages/shared/src/seed.ts: unit and E2E tests rely on the exact seed users.
//   - apps/web/vite.config.ts, when the edit touches the coverage `thresholds` (the 80% floor).
import { readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Text the edit adds: Edit's new_string, Write's content, MultiEdit's edits[].new_string.
const addedText = (input) =>
  [input.new_string, input.content, ...(input.edits ?? []).map((e) => e.new_string)]
    .filter((t) => typeof t === 'string')
    .join('\n')

// Text the edit removes (Edit's old_string, MultiEdit's edits[].old_string).
const removedText = (input) =>
  [input.old_string, ...(input.edits ?? []).map((e) => e.old_string)]
    .filter((t) => typeof t === 'string')
    .join('\n')

// Each rule gets the repo-relative path (forward slashes) and the tool input, and returns a
// reason string when it matches, else null.
const RULES = [
  {
    check: (rel) =>
      rel === 'pnpm-lock.yaml'
        ? 'pnpm-lock.yaml is generated. Change package.json and run pnpm install instead.'
        : null,
  },
  {
    check: (rel) =>
      rel === 'packages/shared/src/seed.ts'
        ? 'The seed users in packages/shared/src/seed.ts are relied on by unit and E2E tests. Ask the user before changing them.'
        : null,
  },
  {
    check: (rel, input) =>
      /^(apps[/](web|api)[/])?vite(st)?\.config\.[cm]?[jt]s$/.test(rel) &&
      /thresholds/.test(`${addedText(input)}\n${removedText(input)}`)
        ? 'The 80% coverage threshold must not be lowered to get a run passing. Ask the user first.'
        : null,
  },
]

const realPath = (p) => {
  try {
    return realpathSync.native(p)
  } catch {
    return path.resolve(p)
  }
}

const repoRoot = realPath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'))

let payload
try {
  payload = JSON.parse(readFileSync(0, 'utf8'))
} catch {
  process.exit(0) // empty or malformed stdin: nothing to protect
}

const input = payload?.tool_input ?? {}
const file = input.file_path
if (typeof file !== 'string' || file === '') process.exit(0)

const abs = realPath(path.resolve(payload.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), file))
const rel = path.relative(repoRoot, abs).split(path.sep).join('/')
if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) process.exit(0)

for (const rule of RULES) {
  const reason = rule.check(rel, input)
  if (reason) {
    process.stderr.write(`Blocked by protect-files hook: ${rel} — ${reason}\n`)
    process.exit(2)
  }
}
process.exit(0)
