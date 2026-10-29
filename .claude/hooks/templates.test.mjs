// Run: node --test .claude/hooks/templates.test.mjs
// The repo is hosted on GitHub and GitLab, and each reads templates from its own folder. GitHub's copy is
// the source; GitLab's copy must have the same body plus a /label quick action. This test catches drift.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (...p) => readFileSync(join(repo, ...p), 'utf8').replace(/\r\n/g, '\n')
const stripFrontmatter = (s) => s.replace(/^---\n[\s\S]*?\n---\n\n/, '')
const stripLabel = (s) => s.replace(/\n+\/label .*\n*$/, '\n')

for (const [github, gitlab] of [
  ['feature.md', 'Feature.md'],
  ['bug.md', 'Bug.md'],
]) {
  test(`${gitlab}: GitLab issue template matches the GitHub one`, () => {
    const gh = read('.github', 'ISSUE_TEMPLATE', github)
    const gl = read('.gitlab', 'issue_templates', gitlab)
    assert.match(
      gh,
      /^---\nname: .+\nabout: .+\nlabels: .+\n---\n/,
      'GitHub template has frontmatter',
    )
    assert.match(
      gl,
      /\n\/label ~"type::\w+" ~"status::todo"\n$/,
      'GitLab template ends with a /label action',
    )
    assert.doesNotMatch(gh, /\/label /, 'GitHub does not understand /label')
    assert.equal(stripLabel(gl), stripFrontmatter(gh))
  })
}

test('merge request template matches the pull request template', () => {
  assert.equal(
    read('.gitlab', 'merge_request_templates', 'Default.md'),
    read('.github', 'pull_request_template.md'),
  )
})
