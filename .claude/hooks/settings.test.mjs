// Run: node --test .claude/hooks/settings.test.mjs
// Checks the hook registrations in .claude/settings.json and user-management/.claude/settings.json.
// Both files carry a copy of the same loader one-liner (settings files cannot share code), so these
// tests keep the copies identical and run the loader itself, without a shell, to check it fails closed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const appDir = join(repo, 'user-management')

// Each settings file, with the project dir Claude Code sets when started there.
const projects = [
  { name: 'root', dir: repo, settings: join(repo, '.claude', 'settings.json') },
  { name: 'user-management', dir: appDir, settings: join(appDir, '.claude', 'settings.json') },
]

// Expected registrations: event -> [matcher, script, exit code when the script cannot be loaded].
const EXPECTED = {
  PreToolUse: ['Bash|PowerShell', 'block-forbidden.mjs', 2], // the guard fails closed
  Stop: [undefined, 'notify-on-finish.mjs', 1],
  PostToolUse: ['Edit|MultiEdit|Write', 'prettier-user-management.mjs', 1],
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
  return spawnSync(process.execPath, ['-e', code, script, failCode], { input, encoding: 'utf8', env })
}

const forcePush = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git push --force' } })
const gitStatus = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } })
const guardOf = (dir) => registrations(projects.find((p) => p.dir === dir).settings).find((r) => r.event === 'PreToolUse')

test('every registration uses the same loader code', () => {
  const codes = new Set(projects.flatMap((p) => registrations(p.settings).map((r) => r.code)))
  assert.equal(codes.size, 1)
})

for (const p of projects) {
  test(`${p.name}: registers the expected hooks, matchers and fail codes`, () => {
    const actual = Object.fromEntries(
      registrations(p.settings).map((r) => [r.event, [r.matcher, r.script.split('/').at(-1), Number(r.failCode)]]),
    )
    assert.deepEqual(actual, EXPECTED)
  })

  test(`${p.name}: every script path resolves from its project dir`, () => {
    for (const r of registrations(p.settings)) assert.ok(existsSync(join(p.dir, r.script)), r.script)
  })

  test(`${p.name}: guard blocks a force push`, () => {
    assert.equal(load(guardOf(p.dir), { projectDir: p.dir, input: forcePush }).status, 2)
  })

  test(`${p.name}: guard allows git status`, () => {
    assert.equal(load(guardOf(p.dir), { projectDir: p.dir, input: gitStatus }).status, 0)
  })
}

test('guard fails closed when CLAUDE_PROJECT_DIR is unset', () => {
  const r = load(guardOf(repo), { projectDir: undefined, input: gitStatus })
  assert.equal(r.status, 2)
  assert.match(r.stderr, /Hook error \(\.claude\/hooks\/\w+/)
})

test('guard fails closed when its script is missing', () => {
  const r = load({ ...guardOf(repo), script: '.claude/hooks/missing.mjs' }, { projectDir: repo, input: gitStatus })
  assert.equal(r.status, 2)
  assert.match(r.stderr, /Hook error \(\.claude\/hooks\/\w+/)
})
