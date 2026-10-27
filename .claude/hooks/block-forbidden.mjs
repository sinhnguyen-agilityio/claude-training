// PreToolUse hook (matcher: Bash|PowerShell): blocks forbidden git commands.
// Reads the tool call JSON from stdin. Exit 2 + reason on stderr blocks the command; exit 0 allows.
// To add a rule or a protected branch, edit PROTECTED_BRANCHES / RULES below — no logic changes.
//
// This is an early warning, not the enforcement. It guesses where git will run from the command
// text, and no text parser can be complete: command substitution and subshells in the middle of a
// line (`echo $(cd main; git commit)`) are not followed. The protected-branch rule is enforced by
// the git hooks in user-management/.husky (pre-commit, pre-push), which see the real branch.
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

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
  // The directory the command runs in. In a linked worktree this differs from CLAUDE_PROJECT_DIR
  // (the main checkout), and the branch must be read where the command actually runs.
  const cwd = typeof parsed.cwd === 'string' ? parsed.cwd : ''
  return {
    command,
    cwd: cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  }
}

// Returns the branch checked out in `cwd`, or null when it cannot be read.
function readBranch(cwd) {
  const res = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd,
    encoding: 'utf8',
  })
  if (res.error || res.status !== 0) return null
  const name = res.stdout.trim()
  return name === '' || name === 'HEAD' ? null : name
}

// Commands that run another command. The directory or repository it acts on may differ from the
// current one (`env -C dir`, `env GIT_DIR=...`), so a git command behind one has an unknown branch.
const WRAPPERS = ['env', 'command', 'builtin', 'exec', 'nohup', 'time']
const WRAPPER_OPTS_WITH_VALUE = ['-C', '--chdir', '-u', '--unset', '-S', '--split-string']
// Options that point git at another repository or ref namespace than the current directory's.
const REDIRECT_OPTS = ['--git-dir', '--work-tree', '--namespace']
const CD_COMMANDS = ['cd', 'chdir', 'pushd', 'push-location', 'set-location', 'sl']
// Change the directory in a way that is not tracked: the directory is unknown afterwards.
const UNTRACKED_CD_COMMANDS = ['popd', 'pop-location']

const tokenize = (segment) =>
  segment
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/^['"]+|['"]+$/g, ''))

const commandName = (token = '') =>
  token
    .split(/[\\/]/)
    .pop()
    .toLowerCase()
    .replace(/\.exe$/, '')

// Returns { sub, args, config, chdir, redirected } for a git segment, or null for any other
// command. `redirected` means git may act on a different repository than the current directory's.
function parseGit(tokens) {
  let start = 0
  let redirected = false
  let wrapped = false
  while (start < tokens.length) {
    const token = tokens[start]
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) {
      if (/^GIT_(DIR|WORK_TREE|NAMESPACE)=/.test(token)) redirected = true
      start += 1
    } else if (WRAPPERS.includes(commandName(token))) {
      redirected = wrapped = true
      start += 1
    } else if (wrapped && token.startsWith('-')) {
      start += WRAPPER_OPTS_WITH_VALUE.includes(token) ? 2 : 1
    } else {
      break
    }
  }
  if (commandName(tokens[start]) !== 'git') return null

  const config = []
  const chdir = []
  let i = start + 1
  while (i < tokens.length && tokens[i].startsWith('-')) {
    const [option] = tokens[i].split('=')
    if (REDIRECT_OPTS.includes(option)) redirected = true
    if (tokens[i] === '-c' && i + 1 < tokens.length) {
      config.push(tokens[i + 1])
      i += 2
    } else if (GLOBAL_OPTS_WITH_VALUE.includes(tokens[i])) {
      if (tokens[i] === '-C' && i + 1 < tokens.length) chdir.push(tokens[i + 1])
      i += 2
    } else {
      i += 1
    }
  }
  return { sub: tokens[i] ?? '', args: tokens.slice(i + 1), config, chdir, redirected }
}

// The directory after a segment runs, or null when it cannot be worked out (null makes the branch
// unknown, which blocks commits and bare pushes). `prevOp` and `nextOp` are the operators around
// the segment. A `cd` only carries over when it always runs (not behind `||` or `|`) and the next
// command runs only if it worked (`&&`), so the shell and this hook agree on where that command is.
function dirAfter(tokens, dir, prevOp, nextOp) {
  const name = commandName(tokens[0])
  if (WRAPPERS.includes(name)) {
    const moves = (t) => CD_COMMANDS.includes(t.toLowerCase()) || UNTRACKED_CD_COMMANDS.includes(t)
    return tokens.some(moves) ? null : dir
  }
  if (UNTRACKED_CD_COMMANDS.includes(name)) return null
  if (!CD_COMMANDS.includes(name)) return dir

  const target = tokens[1]
  const alwaysRuns = prevOp === undefined || prevOp === '&&' || prevOp === ';'
  const unclear = tokens.length !== 2 || target.startsWith('-') || /[$%~`]/.test(target)
  if (dir === null || !alwaysRuns || nextOp !== '&&' || unclear) return null
  return resolve(dir, target)
}

function main() {
  const { command, cwd } = readInput()
  let dir = cwd
  const branches = new Map()
  const branchIn = (where) => {
    if (where === null) return null
    if (!branches.has(where)) branches.set(where, readBranch(where))
    return branches.get(where)
  }

  // Splitting on a capturing group keeps the operators: [segment, operator, segment, ...].
  // A backslash (or a PowerShell backtick) before a newline continues the line, so `git \` +
  // `commit` is one command. Join those lines first, or the split below would hide the subcommand.
  const joined = command.replace(/(\\|`)\r?\n/g, '')
  // Anywhere in the command, a GIT_DIR-style variable can send later git commands to another
  // repository (`export GIT_DIR=... && git commit`), so the branch cannot be trusted.
  // Matches an assignment (`GIT_DIR=`, `export X=`, `$env:X=`, `set X=`) or a setter that takes the
  // name without `=` (`setx`, `export X`, `SetEnvironmentVariable`), not a mere mention in a message.
  const GIT_VARS = 'GIT_(?:DIR|WORK_TREE|NAMESPACE|COMMON_DIR)'
  const envRedirects = new RegExp(
    `\\b${GIT_VARS}\\b\\s*=|\\b(?:setx|export|SetEnvironmentVariable)\\b[^;&|\\n]*\\b${GIT_VARS}\\b`,
    'i',
  ).test(joined)
  const parts = joined.split(/(&&|\|\||;|\||\n)/)
  for (let p = 0; p < parts.length; p += 2) {
    const segment = parts[p].trim()
    if (!segment) continue
    // A subshell or group has its own directory, so the directory is unknown from here on.
    // Only the opening is checked: a closing `)` also ends many commit message lines.
    if (/^[({]/.test(segment)) dir = null
    const tokens = tokenize(segment.replace(/^[({\s]+/, '').replace(/[)}\s]+$/, ''))
    dir = dirAfter(tokens, dir, parts[p - 1], parts[p + 1])
    const git = parseGit(tokens)
    if (!git) continue

    // `git -C <path>` runs in <path>, relative to the directory the command is in. Pointing git
    // at another repository (`--git-dir`, `GIT_DIR=`, behind `env`) leaves the branch unknown.
    const gitDir =
      git.redirected || envRedirects
        ? null
        : git.chdir.reduce((where, path) => (where === null ? null : resolve(where, path)), dir)
    const branch = () => branchIn(gitDir)
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
