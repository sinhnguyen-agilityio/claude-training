// Run: node --test .claude/hooks/convention.test.mjs
// The pure checkers behind .husky/commit-msg, .husky/pre-push and block-forbidden.mjs.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BRANCH_REGEX,
  COMMIT_TYPES,
  checkBranchName,
  checkCommitMessage,
} from './convention.mjs'

const rule = (message) => checkCommitMessage(message)?.rule ?? null

describe('checkCommitMessage', () => {
  test('lists the ten conventional types', () => {
    assert.deepEqual(
      [...COMMIT_TYPES],
      ['feat', 'fix', 'docs', 'test', 'refactor', 'perf', 'ci', 'build', 'chore', 'revert'],
    )
  })

  test('accepts a plain header, a SPEC tag and an issue tag (AC2)', () => {
    for (const msg of [
      'feat: add export',
      'feat: add export (F8)',
      'chore: tidy hooks (#32)',
      'fix(users): keep the page on delete',
      'refactor!: drop the v1 query format',
      'chore(.claude): tidy hooks',
      'docs(SPEC): clarify F7',
      'feat(api/users): add export',
      'feat(api)!: rename the users route',
    ]) {
      assert.equal(checkCommitMessage(msg), null, msg)
    }
  })

  test('rejects a header without a type, with an unknown type or without a colon (AC3)', () => {
    assert.equal(rule('Fix stuff'), 'header-format')
    assert.equal(rule('feature: x'), 'type')
    assert.equal(rule('Feat: add export'), 'type')
    assert.equal(rule(''), 'header-format')
  })

  test('rejects a missing space after the colon and an empty description (AC3)', () => {
    assert.equal(rule('feat:x'), 'space-after-colon')
    assert.equal(rule('feat:  two spaces'), 'space-after-colon')
    assert.equal(rule('feat:'), 'description-empty')
    assert.equal(rule('feat: '), 'description-empty')
  })

  test('names the rule and shows a valid example in the message (AC3)', () => {
    const res = checkCommitMessage('feature: x')
    assert.match(res.message, /type/i)
    assert.match(res.message, /feat: add export/)
  })

  test('limits the header to 72 characters (AC4)', () => {
    const header = (n) => 'feat: ' + 'a'.repeat(n - 6)
    assert.equal(header(72).length, 72)
    assert.equal(checkCommitMessage(header(72)), null)
    assert.equal(rule(header(73)), 'header-length')
  })

  test('rejects a capital first letter and a trailing period (AC4)', () => {
    assert.equal(rule('feat: Add export'), 'lowercase')
    assert.equal(rule('feat: add export.'), 'no-period')
    assert.equal(checkCommitMessage('feat: add CSV export'), null)
  })

  test('needs a blank line between the header and the body (AC5)', () => {
    assert.equal(rule('feat: add export\nbody right away'), 'blank-line')
    assert.equal(checkCommitMessage('feat: add export\n\nbody after a blank line'), null)
  })

  test('does not check the length of body lines (AC5)', () => {
    assert.equal(checkCommitMessage(`feat: add export\n\n${'word '.repeat(60)}`), null)
  })

  test('ignores git comment lines and trailing blank lines', () => {
    assert.equal(checkCommitMessage('feat: add export\n\n# Please enter the message\n'), null)
    assert.equal(checkCommitMessage('feat: add export\n'), null)
  })

  test('lets git-generated messages through (AC6)', () => {
    for (const msg of [
      "Merge branch 'x' into main",
      'Merge pull request #50 from a/b',
      'Revert "feat: add export"',
      'fixup! feat: add export',
      'squash! feat: add export',
      'amend! feat: add export',
    ]) {
      assert.equal(checkCommitMessage(msg), null, msg)
    }
  })
})

describe('checkBranchName', () => {
  test('accepts <type>/<n>-<slug> with up to five slug words (AC1, AC7)', () => {
    for (const name of [
      'feat/12-add-export',
      'chore/51-enforce-commit-branch-rules',
      'fix/7-x',
      'chore/9-a-b-c-d-e',
      'revert/3-undo-the-thing',
    ]) {
      assert.equal(checkBranchName(name), null, name)
      assert.match(name, BRANCH_REGEX)
    }
  })

  test('rejects names that break the regex (AC7)', () => {
    for (const name of [
      'feat/workflow',
      'Feature/12-x',
      'feature/12-x',
      'chore/12-a-b-c-d-e-f',
      'feat/12',
      'feat/12-Add-Export',
      'feat/12-add_export',
      'feat/12-add-export-',
      'chore/release-1.2.0',
      'main',
    ]) {
      assert.equal(checkBranchName(name)?.rule, 'branch-name', name)
    }
  })

  test('shows the regex and an example in the message (AC7)', () => {
    const res = checkBranchName('feat/workflow')
    assert.ok(res.message.includes(BRANCH_REGEX.source))
    assert.match(res.message, /feat\/12-add-export/)
  })

  test('exempts claude/ and dependabot/ branches (A3)', () => {
    assert.equal(checkBranchName('claude/meal-planning-app-ee384b'), null)
    assert.equal(checkBranchName('dependabot/github_actions/pnpm/action-setup-6'), null)
  })
})
