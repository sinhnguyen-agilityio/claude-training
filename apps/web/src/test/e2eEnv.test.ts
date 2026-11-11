// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { resolveE2eEnv } from '../../e2e-env'

// POST /api/reset wipes the database the E2E API points at, so resolveE2eEnv refuses to start
// unless E2E_DATABASE_URL names a database that is plainly meant for E2E.
describe('resolveE2eEnv', () => {
  const DB = 'postgres://app:app@localhost:5432/e2e_46'

  it('accepts a local E2E database and uses the default ports', () => {
    expect(resolveE2eEnv({ E2E_DATABASE_URL: DB })).toEqual({
      port: 4173,
      apiPort: 3101,
      databaseUrl: DB,
    })
  })

  it('reads the ports and ignores empty or non-numeric values', () => {
    const env = { E2E_DATABASE_URL: DB, E2E_PORT: '4175', E2E_API_PORT: '3011' }
    expect(resolveE2eEnv(env)).toMatchObject({ port: 4175, apiPort: 3011 })
    expect(resolveE2eEnv({ ...env, E2E_PORT: '', E2E_API_PORT: 'abc' })).toMatchObject({
      port: 4173,
      apiPort: 3101,
    })
  })

  it('refuses an unset or empty E2E_DATABASE_URL, even when DATABASE_URL is set', () => {
    expect(() => resolveE2eEnv({})).toThrow(/E2E_DATABASE_URL is not set/)
    expect(() => resolveE2eEnv({ E2E_DATABASE_URL: '  ' })).toThrow(/E2E_DATABASE_URL is not set/)
    expect(() => resolveE2eEnv({ DATABASE_URL: DB })).toThrow(/E2E_DATABASE_URL is not set/)
  })

  it('refuses a value that is not a URL', () => {
    expect(() => resolveE2eEnv({ E2E_DATABASE_URL: 'not a url' })).toThrow(/not a valid URL/)
  })

  it('refuses the same database as DATABASE_URL, comparing parsed URLs', () => {
    const same = 'postgres://app:app@localhost:5432/e2e_46'
    expect(() => resolveE2eEnv({ E2E_DATABASE_URL: DB, DATABASE_URL: same })).toThrow(
      /same database as DATABASE_URL/,
    )
    // Different spelling, same database: default port, upper-case host, trailing slash.
    expect(() =>
      resolveE2eEnv({
        E2E_DATABASE_URL: 'postgres://app:app@LOCALHOST/e2e_46/',
        DATABASE_URL: 'postgresql://app:app@localhost:5432/e2e_46',
      }),
    ).toThrow(/same database as DATABASE_URL/)
    // A different database on the same server is fine.
    expect(
      resolveE2eEnv({
        E2E_DATABASE_URL: DB,
        DATABASE_URL: 'postgres://app:app@localhost:5432/other',
      }).databaseUrl,
    ).toBe(DB)
  })

  it('refuses a database named users_dev', () => {
    expect(() =>
      resolveE2eEnv({ E2E_DATABASE_URL: 'postgres://app:app@localhost:5432/users_dev' }),
    ).toThrow(/users_dev/)
  })

  it.each(['localhost', '127.0.0.1', '[::1]', 'db'])('accepts the local host %s', (host) => {
    const url = `postgres://app:app@${host}:5432/users_e2e`
    expect(resolveE2eEnv({ E2E_DATABASE_URL: url }).databaseUrl).toBe(url)
  })

  it('refuses a remote host unless E2E_ALLOW_REMOTE_DB=1', () => {
    const remote = 'postgres://app:app@db.example.com:5432/users_e2e'
    expect(() => resolveE2eEnv({ E2E_DATABASE_URL: remote })).toThrow(/E2E_ALLOW_REMOTE_DB=1/)
    expect(() => resolveE2eEnv({ E2E_DATABASE_URL: remote, E2E_ALLOW_REMOTE_DB: 'true' })).toThrow(
      /E2E_ALLOW_REMOTE_DB=1/,
    )
    expect(resolveE2eEnv({ E2E_DATABASE_URL: remote, E2E_ALLOW_REMOTE_DB: '1' }).databaseUrl).toBe(
      remote,
    )
  })

  it('does not print the password in an error', () => {
    const remote = 'postgres://app:s3cret@db.example.com:5432/users_e2e'
    expect(() => resolveE2eEnv({ E2E_DATABASE_URL: remote })).toThrow(/remote host db.example.com/)
    expect(() => resolveE2eEnv({ E2E_DATABASE_URL: remote })).not.toThrow(/s3cret/)
    expect(() => resolveE2eEnv({ E2E_DATABASE_URL: 'x://:s3cret@' })).toThrow(/not a valid URL/)
  })
})
