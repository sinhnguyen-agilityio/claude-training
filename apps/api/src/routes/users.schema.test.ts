import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// AC8: the query is parsed with the schema of @app/shared (the web app and the API cannot disagree),
// never with a copy. Reading the source is the only way to see that the route does not define one.
const layers = ['../routes/users.ts', '../controllers/users.ts', '../services/users.ts']

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

describe('the users list query', () => {
  it('is parsed with usersQuerySchema from @app/shared', () => {
    expect(source('../routes/users.ts')).toMatch(
      /import\s*\{[^}]*\busersQuerySchema\b[^}]*\}\s*from\s*'@app\/shared'/,
    )
  })

  it.each(layers)('%s defines no Zod schema of its own', (path) => {
    const code = source(path)

    expect(code).not.toMatch(/from\s*'zod'/)
    expect(code).not.toMatch(/\bz\.(object|string|number|enum)\(/)
  })
})
