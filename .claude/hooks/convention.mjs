// The commit message and branch name convention (WORKFLOW.md rules 2 and 3), as pure functions.
// Used by .husky/commit-msg, .husky/pre-push and block-forbidden.mjs, so the three agree.
// No dependencies. Each check returns null when the input is fine, else { rule, message }.
//
// CLI (for the shell hooks):
//   node convention.mjs commit-msg <file>   exit 1 + message on stderr when the message is rejected
//   node convention.mjs branch <name>       the same for a branch name
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const COMMIT_TYPES = [
  'feat',
  'fix',
  'docs',
  'test',
  'refactor',
  'perf',
  'ci',
  'build',
  'chore',
  'revert',
]
export const MAX_HEADER_LENGTH = 72

const TYPES = COMMIT_TYPES.join('|')
export const BRANCH_REGEX = new RegExp(`^(${TYPES})/[0-9]+-[a-z0-9]+(-[a-z0-9]+){0,4}$`)
export const BRANCH_EXAMPLE = 'feat/12-add-export'
export const COMMIT_EXAMPLE = 'feat: add export (F8)'

// Branches that bots create (A3).
const EXEMPT_BRANCH_PREFIXES = ['claude/', 'dependabot/']
// Messages git writes itself.
const GENERATED_PREFIXES = ['Merge ', 'Revert "', 'fixup! ', 'squash! ', 'amend! ']

const fail = (rule, problem) => ({
  rule,
  message:
    `Commit message rejected [${rule}]: ${problem}\n` +
    `Format: type(scope)!: description  (scope and ! optional; types: ${COMMIT_TYPES.join(', ')})\n` +
    `Example: ${COMMIT_EXAMPLE}`,
})

export function checkCommitMessage(text) {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('#'))
    .map((line) => line.trimEnd())
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  const header = lines[0] ?? ''

  if (GENERATED_PREFIXES.some((prefix) => header.startsWith(prefix))) return null

  const match = /^([A-Za-z]+)(\([^()\s]+\))?(!)?:(.*)$/.exec(header)
  if (!match) {
    return fail('header-format', `"${header}" does not start with "type: ".`)
  }
  const [, type, , , rest] = match
  if (!COMMIT_TYPES.includes(type)) {
    return fail('type', `"${type}" is not a known type.`)
  }
  if (rest.trim() === '') return fail('description-empty', 'the description is empty.')
  if (!rest.startsWith(' ') || rest.startsWith('  ')) {
    return fail('space-after-colon', 'put exactly one space after the colon.')
  }
  const description = rest.slice(1)

  if (header.length > MAX_HEADER_LENGTH) {
    return fail(
      'header-length',
      `the header is ${header.length} characters, the limit is ${MAX_HEADER_LENGTH}.`,
    )
  }
  if (/^\p{Lu}/u.test(description)) {
    return fail('lowercase', 'the description starts with a lowercase letter.')
  }
  if (description.endsWith('.')) return fail('no-period', 'the header has no trailing period.')
  if (lines.length > 1 && lines[1] !== '') {
    return fail('blank-line', 'leave one blank line between the header and the body.')
  }
  return null
}

export function checkBranchName(name) {
  if (EXEMPT_BRANCH_PREFIXES.some((prefix) => name.startsWith(prefix))) return null
  if (BRANCH_REGEX.test(name)) return null
  return {
    rule: 'branch-name',
    message:
      `Branch name rejected [branch-name]: "${name}" does not match ${BRANCH_REGEX.source}\n` +
      `Format: <type>/<issue number>-<slug of at most 5 words>, lowercase letters and digits only.\n` +
      `Example: ${BRANCH_EXAMPLE}`,
  }
}

function cli([command, arg]) {
  let result
  if (command === 'commit-msg' && arg) result = checkCommitMessage(readFileSync(arg, 'utf8'))
  else if (command === 'branch' && arg) result = checkBranchName(arg)
  else {
    process.stderr.write('usage: convention.mjs commit-msg <file> | branch <name>\n')
    return 2
  }
  if (result) process.stderr.write(`${result.message}\n`)
  return result ? 1 : 0
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(cli(process.argv.slice(2)))
}
