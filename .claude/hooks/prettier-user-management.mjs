// PostToolUse hook (matcher: Edit|MultiEdit|Write): runs Prettier on files Claude edits under
// user-management/.
// Reads the tool call JSON from stdin. Files elsewhere, listed in user-management/.prettierignore, or
// with no Prettier parser are skipped. Options match the Prettier CLI run in user-management/
// (nearest config file, .editorconfig, .prettierignore), so the hook and lint-staged agree.
// Never blocks: a formatting failure exits 1, which Claude Code shows as a non-blocking error.
// Test-only flags (argv, so nothing in the environment can switch them on):
//   --test-dry-run         print the file it would format as JSON instead of formatting it
//   --test-app-dir=<dir>   use <dir> in place of user-management/
import { readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'

// The settings.json loader passes <script> <failCode> as argv, which land among the positionals.
const { values: flags } = parseArgs({
  args: process.argv.slice(2),
  options: { 'test-dry-run': { type: 'boolean' }, 'test-app-dir': { type: 'string' } },
  allowPositionals: true,
  strict: false,
})

// Real path (symlinks and junctions resolved), so it compares equal to the real path of the file.
const realPath = (p) => {
  try {
    return realpathSync.native(p)
  } catch {
    return path.resolve(p) // missing file: compare the path as given
  }
}

// Resolved from this script's location, so it does not depend on where Claude was started.
const repoAppDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'user-management')
const appDir = realPath(flags['test-app-dir'] || repoAppDir)
const prettierEntry = path.join(repoAppDir, 'node_modules', 'prettier', 'index.mjs')

function fail(message) {
  console.error(`Prettier hook: ${message}`)
  process.exit(1)
}

let input
try {
  input = JSON.parse(readFileSync(0, 'utf8'))
} catch {
  process.exit(0) // empty or malformed stdin: nothing to format
}

const file = input?.tool_input?.file_path
if (typeof file !== 'string' || file === '') process.exit(0)

// A relative path is relative to the session's cwd, not to this process's.
const abs = realPath(path.resolve(input.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), file))
const rel = path.relative(appDir, abs)
const outside = rel === '' || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)
if (outside) process.exit(0)

if (flags['test-dry-run']) {
  console.log(JSON.stringify({ appDir, file: abs }))
  process.exit(0)
}

if (!existsSync(prettierEntry)) fail('Prettier is not installed. Run `pnpm install` in user-management/.')

// Prettier's API runs in this process (no shell, no child process).
try {
  const prettier = await import(pathToFileURL(prettierEntry).href)
  const options = (await prettier.resolveConfig(abs, { editorconfig: true })) ?? {}
  const info = await prettier.getFileInfo(abs, {
    ignorePath: path.join(appDir, '.prettierignore'),
    plugins: options.plugins,
  })
  if (info.ignored || !info.inferredParser) process.exit(0)

  const source = readFileSync(abs, 'utf8')
  const formatted = await prettier.format(source, { ...options, filepath: abs })
  if (formatted !== source) writeFileSync(abs, formatted)
} catch (err) {
  fail(`could not format ${rel} (${err.message})`)
}
