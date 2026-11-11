// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { resolveE2eEnv } from '../../e2e-env'

// POST /api/reset wipes the database the E2E API points at, so E2E must never fall back to the
// dev database: it refuses to start without E2E_DATABASE_URL.
describe('resolveE2eEnv', () => {
  const DB = 'postgres://app:app@localhost:5432/users_e2e'

  it('refuses to start without E2E_DATABASE_URL, even when DATABASE_URL is set', () => {
    expect(() => resolveE2eEnv({})).toThrow(/E2E_DATABASE_URL/)
    expect(() => resolveE2eEnv({ E2E_DATABASE_URL: '  ' })).toThrow(/E2E_DATABASE_URL/)
    expect(() =>
      resolveE2eEnv({ DATABASE_URL: 'postgres://app:app@localhost:5432/users_dev' }),
    ).toThrow(/E2E_DATABASE_URL/)
  })

  it('uses the defaults for the ports', () => {
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
})
