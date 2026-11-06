import { describe, expect, it } from 'vitest'
import { loadEnv } from './env'

describe('loadEnv', () => {
  it('applies the defaults when nothing is set', () => {
    expect(loadEnv({})).toEqual({
      PORT: 3001,
      DATABASE_URL: undefined,
      ALLOW_RESET: false,
      NODE_ENV: 'development',
    })
  })

  it('parses valid values', () => {
    const env = loadEnv({
      PORT: '4000',
      DATABASE_URL: 'postgres://app:app@localhost:5432/users_dev',
      ALLOW_RESET: 'true',
      NODE_ENV: 'production',
    })

    expect(env).toEqual({
      PORT: 4000,
      DATABASE_URL: 'postgres://app:app@localhost:5432/users_dev',
      ALLOW_RESET: true,
      NODE_ENV: 'production',
    })
  })

  it('reads the string "false" as false', () => {
    expect(loadEnv({ ALLOW_RESET: 'false' }).ALLOW_RESET).toBe(false)
  })

  it('treats empty strings as unset', () => {
    const env = loadEnv({ PORT: '', DATABASE_URL: '', ALLOW_RESET: '', NODE_ENV: '' })

    expect(env.PORT).toBe(3001)
    expect(env.DATABASE_URL).toBeUndefined()
    expect(env.ALLOW_RESET).toBe(false)
    expect(env.NODE_ENV).toBe('development')
  })

  it('treats a whitespace-only value as unset', () => {
    const env = loadEnv({ PORT: ' ', ALLOW_RESET: '  ' })

    expect(env.PORT).toBe(3001)
    expect(env.ALLOW_RESET).toBe(false)
  })

  it.each([
    ['PORT', 'abc'],
    ['PORT', '0'],
    ['PORT', '70000'],
    ['DATABASE_URL', 'not a url'],
    ['ALLOW_RESET', 'yes'],
    ['NODE_ENV', 'staging'],
  ])('rejects an invalid %s and names it without its value', (name, value) => {
    let message = ''
    try {
      loadEnv({ [name]: value })
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }

    expect(message).toContain(name)
    expect(message).not.toContain(value)
  })

  it('names every invalid variable', () => {
    expect(() => loadEnv({ PORT: 'abc', NODE_ENV: 'staging' })).toThrow(/PORT/)
    expect(() => loadEnv({ PORT: 'abc', NODE_ENV: 'staging' })).toThrow(/NODE_ENV/)
  })
})
