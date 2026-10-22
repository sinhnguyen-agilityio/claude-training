// PreToolUse hook (matcher: Bash|PowerShell): blocks forbidden git commands.
// Reads the tool call JSON from stdin. Exit 2 + reason on stderr blocks the command; exit 0 allows.
// To add a rule or a protected branch, edit PROTECTED_BRANCHES / RULES below — no logic changes.
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const PROTECTED_BRANCHES = ['main', 'master']

// Each rule gets a parsed git segment and returns a reason string when it matches, else null.
//   ctx = { sub, args, positionals, config, hasShort(c), hasLong(name), branch() }
// ctx.branch() returns the current branch name, or null when it cannot be read.
const RULES = [
  // --- Destructive git operations ---
  {
    group: 'destructive',
    check: (c) =>
      c.sub === 'push' && (c.hasShort('f') || c.hasLong('--force'))
        ? 'Force push rewrites remote history. Use --force-with-lease instead.'
        : null,
  },
  {
    group: 'destructive',
    check: (c) =>
      c.sub === 'reset' && c.hasLong('--hard')
        ? 'git reset --hard discards uncommitted work.'
        : null,
  },
  {
    group: 'destructive',
    check: (c) =>
      c.sub === 'clean' &&
      (c.hasShort('f') || c.hasLong('--force')) &&
      !(c.hasShort('n') || c.hasLong('--dry-run'))
        ? 'git clean -f deletes untracked files. Preview with git clean -n first.'
        : null,
  },
  {
    group: 'destructive',
    check: (c) =>
      c.sub === 'checkout' && c.args.includes('.')
        ? 'git checkout . discards all working-tree changes.'
        : null,
  },
  {
    group: 'destructive',
    check: (c) =>
      c.sub === 'restore' && c.args.includes('.')
        ? 'git restore . discards all working-tree changes.'
        : null,
  },

  // --- Bypassing hooks ---
  {
    group: 'bypass',
    check: (c) =>
      c.hasLong('--no-verify')
        ? '--no-verify skips the husky pre-commit hook. Fix the underlying failure instead.'
        : null,
  },
  {
    group: 'bypass',
    check: (c) => (c.hasLong('--no-gpg-sign') ? '--no-gpg-sign bypasses commit signing.' : null),
  },
  {
    group: 'bypass',
    check: (c) =>
      c.config.some((kv) => kv.replace(/\s/g, '').toLowerCase() === 'commit.gpgsign=false')
        ? '-c commit.gpgsign=false bypasses commit signing.'
        : null,
  },

  // --- Protected branches ---
  {
    group: 'protected-branch',
    check: (c) => {
      if (c.sub !== 'commit') return null
      const branch = c.branch()
      if (branch === null) return BRANCH_UNKNOWN
      return PROTECTED_BRANCHES.includes(branch)
        ? `Cannot commit directly on protected branch "${branch}". Create a feature branch first.`
        : null
    },
  },
  {
    group: 'protected-branch',
    check: (c) => {
      if (c.sub !== 'push') return null
      const targets = c.positionals.slice(1).map((ref) => ref.split(':').pop())
      const hit = targets.find((t) => PROTECTED_BRANCHES.includes(t))
      if (hit) return `Cannot push to protected branch "${hit}". Push a feature branch instead.`
      if (c.positionals.length > 0) return null
      const branch = c.branch()
      if (branch === null) return BRANCH_UNKNOWN
      return PROTECTED_BRANCHES.includes(branch)
        ? `Bare git push while on protected branch "${branch}". Switch to a feature branch first.`
        : null
    },
  },
]

const BRANCH_UNKNOWN =
  'Cannot determine the current branch (not a git repo, detached HEAD, or git error), so this is blocked to be safe.'

// Options before the subcommand that take a separate value argument.
const GLOBAL_OPTS_WITH_VALUE = ['-C', '--git-dir', '--work-tree', '--namespace', '--exec-path']

function block(message) {
  process.stderr.write(`${message}\n`)
  process.exit(2)
}

function readInput() {
  let raw = ''
  try {
    raw = readFileSync(0, 'utf8')
  } catch {
    // empty / closed stdin: handled below as invalid input
  }
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    block(`block-forbidden hook: stdin is not valid JSON (${err.message}). Blocking the command.`)
  }
  const command = parsed?.tool_input?.command
  if (typeof command !== 'string' || command.trim() === '') {
    block('block-forbidden hook: tool_input.command is missing or empty. Blocking the command.')
  }
  return command
}

function readBranch() {
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd()
  const res = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding: 'utf8' })
  if (res.error || res.status !== 0) return null
  const name = res.stdout.trim()
  return name === '' || name === 'HEAD' ? null : name
}

// Returns { sub, args, config } for a git segment, or null for any other command.
function parseGit(segment) {
  const tokens = segment
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/^['"]+|['"]+$/g, ''))
  const exe = tokens[0]
    ?.split(/[\\/]/)
    .pop()
    .toLowerCase()
    .replace(/\.exe$/, '')
  if (exe !== 'git') return null

  const config = []
  let i = 1
  while (i < tokens.length && tokens[i].startsWith('-')) {
    if (tokens[i] === '-c' && i + 1 < tokens.length) {
      config.push(tokens[i + 1])
      i += 2
    } else if (GLOBAL_OPTS_WITH_VALUE.includes(tokens[i])) {
      i += 2
    } else {
      i += 1
    }
  }
  return { sub: tokens[i] ?? '', args: tokens.slice(i + 1), config }
}

function main() {
  const command = readInput()
  let cachedBranch
  const branch = () => (cachedBranch === undefined ? (cachedBranch = readBranch()) : cachedBranch)

  for (const raw of command.split(/&&|\|\||;|\|/)) {
    const segment = raw.trim()
    const git = segment && parseGit(segment)
    if (!git) continue

    const { args } = git
    const ctx = {
      ...git,
      positionals: args.filter((a) => !a.startsWith('-')),
      hasShort: (letter) => args.some((a) => /^-[a-zA-Z]+$/.test(a) && a.includes(letter)),
      hasLong: (name) => args.includes(name),
      branch,
    }
    for (const rule of RULES) {
      const reason = rule.check(ctx)
      if (reason) block(`Blocked by block-forbidden hook [${rule.group}]: "${segment}" — ${reason}`)
    }
  }
  process.exit(0)
}

main()
