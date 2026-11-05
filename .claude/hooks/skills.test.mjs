// Run: node --test .claude/hooks/skills.test.mjs
// Checks the skills in .claude/skills/: each has valid frontmatter and a row in the README, and the
// skills that own a format (issue and PR bodies; there are no template files) keep its headings.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const skillsDir = join(repo, '.claude', 'skills')
const read = (...p) => readFileSync(join(repo, ...p), 'utf8').replace(/\r\n/g, '\n')

const skills = readdirSync(skillsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

// The headings of each format, in order. Change them here and in the skill together.
const FORMATS = {
  'ticket-pack': [
    'Story',
    'Background',
    'Acceptance criteria',
    'Out of scope',
    'Test plan',
    'Definition of done',
    'Dependencies',
    'Open questions',
    'Assumptions',
  ],
  'bug-report': [
    'Summary',
    'Environment',
    'Steps to reproduce',
    'Expected result',
    'Actual result',
    'Frequency',
    'Evidence',
    'Hypotheses log',
    'Assumptions',
    'Definition of done',
    'Failing test',
  ],
  'pr-description': ['What', 'Why', 'Assumptions', 'How tested', 'Risk', 'Evidence'],
}

function frontmatter(text) {
  const block = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? ''
  return Object.fromEntries(
    block
      .split('\n')
      .map((line) => /^(\w[\w-]*):\s*(.*)$/.exec(line))
      .filter(Boolean)
      .map((m) => [m[1], m[2].trim()]),
  )
}

// The `##` headings inside the first fenced block under the skill's "## Template" heading.
function templateHeadings(text) {
  const section = text.split(/^## Template\n/m)[1]
  assert.ok(section, 'has a "## Template" section')
  const block = /```markdown\n([\s\S]*?)\n```/.exec(section)?.[1]
  assert.ok(block, 'the Template section has a ```markdown block')
  return [...block.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim())
}

test('there are skills to check', () => {
  assert.ok(skills.length > 0)
})

for (const name of skills) {
  test(`${name}: SKILL.md frontmatter has the folder name and a description`, () => {
    const file = join('.claude', 'skills', name, 'SKILL.md')
    assert.ok(existsSync(join(repo, file)), `${file} exists`)
    const meta = frontmatter(read(file))
    assert.equal(meta.name, name)
    assert.ok(meta.description, 'description is not empty')
  })

  test(`${name}: listed in the README Skills table`, () => {
    assert.ok(
      read('README.md').includes(`| [${name}](.claude/skills/${name}/SKILL.md)`),
      `README has a row starting with [${name}](.claude/skills/${name}/SKILL.md)`,
    )
  })
}

for (const [name, headings] of Object.entries(FORMATS)) {
  test(`${name}: Template has the format's headings, in order`, () => {
    assert.deepEqual(templateHeadings(read('.claude', 'skills', name, 'SKILL.md')), headings)
  })
}

// /start-ticket writes assumptions into Feature and Bug issues alike, so both use one table.
const ASSUMPTION_COLUMNS = ['ID', 'Question', 'Default taken', 'Why', 'Affects']

for (const name of ['ticket-pack', 'bug-report']) {
  test(`${name}: the Assumptions table has the shared columns`, () => {
    const template = read('.claude', 'skills', name, 'SKILL.md').split(/^## Template\n/m)[1] ?? ''
    const header = /^## Assumptions\n\n(\|.*\|)$/m.exec(template)?.[1]
    assert.ok(header, 'the Template has an Assumptions table')
    const columns = header
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim())
    assert.deepEqual(columns, ASSUMPTION_COLUMNS)
  })
}
