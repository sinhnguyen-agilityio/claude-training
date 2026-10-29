// Run: node --test .claude/hooks/settings.test.mjs
// Checks the hook registrations in .claude/settings.json: the expected hooks, matchers and fail codes.
// It also runs the loader one-liner itself, without a shell, to check that the guard fails closed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const settings = join(repo, '.claude', 'settings.json')

// Expected registrations: event -> [matcher, script, exit code when the script cannot be loaded].
const EXPECTED = {
  PreToolUse: ['Bash|PowerShell', 'block-forbidden.mjs', 2], // the guard fails closed
  Stop: [undefined, 'notify-on-finish.mjs', 1],
  PostToolUse: ['Edit|MultiEdit|Write', 'format-on-edit.mjs', 1],
}

const COMMAND = /^node -e "(?<code>[^"]+)" (?<script>\S+) (?<failCode>\d+)$/

function registrations(settingsFile) {
  const { hooks } = JSON.parse(readFileSync(settingsFile, 'utf8'))
  return Object.entries(hooks).map(([event, groups]) => {
    assert.equal(groups.length, 1, `${event}: one matcher group`)
    assert.equal(groups[0].hooks.length, 1, `${event}: one hook`)
    const match = COMMAND.exec(groups[0].hooks[0].command)
    assert.ok(match, `${event}: command has the form node -e "<loader>" <script> <failCode>`)
    return { event, matcher: groups[0].matcher, ...match.groups }
  })
}

// Runs a registration's loader the way the shell would, with argv and env set explicitly.
function load({ code, script, failCode }, { projectDir, input }) {
  const env = { ...process.env }
  if (projectDir === undefined) delete env.CLAUDE_PROJECT_DIR
  else env.CLAUDE_PROJECT_DIR = projectDir
  return spawnSync(process.execPath, ['-e', code, script, failCode], {
    input,
    encoding: 'utf8',
    env,
  })
}

const forcePush = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git push --force' } })
const gitStatus = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } })
const guard = registrations(settings).find((r) => r.event === 'PreToolUse')

test('registers the expected hooks, matchers and fail codes', () => {
  const actual = Object.fromEntries(
    registrations(settings).map((r) => [
      r.event,
      [r.matcher, r.script.split('/').at(-1), Number(r.failCode)],
    ]),
  )
  assert.deepEqual(actual, EXPECTED)
})

test('every script path resolves from the project dir', () => {
  for (const r of registrations(settings)) assert.ok(existsSync(join(repo, r.script)), r.script)
})

test('guard blocks a force push', () => {
  assert.equal(load(guard, { projectDir: repo, input: forcePush }).status, 2)
})

test('guard allows git status', () => {
  assert.equal(load(guard, { projectDir: repo, input: gitStatus }).status, 0)
})

test('guard fails closed when CLAUDE_PROJECT_DIR is unset', () => {
  const r = load(guard, { projectDir: undefined, input: gitStatus })
  assert.equal(r.status, 2)
  assert.match(r.stderr, /Hook error \(\.claude\/hooks\/\w+/)
})

test('guard fails closed when its script is missing', () => {
  const r = load(
    { ...guard, script: '.claude/hooks/missing.mjs' },
    { projectDir: repo, input: gitStatus },
  )
  assert.equal(r.status, 2)
  assert.match(r.stderr, /Hook error \(\.claude\/hooks\/\w+/)
})
