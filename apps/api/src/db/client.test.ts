import { sql } from 'drizzle-orm'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { TEST_DATABASE_URL } from '../test/createTestDb'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)
const { db, pool } = await import('./client')

afterAll(async () => {
  await pool.end()
  vi.unstubAllEnvs()
})

describe('db client', () => {
  it('uses a pool of at most 5 connections', () => {
    expect(pool.options.max).toBe(5)
  })

  it('logs the error of an idle client instead of crashing the process', () => {
    const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true)

    // Without a listener on the pool, EventEmitter throws here and the API would exit.
    expect(() => pool.emit('error', new Error('connection reset'))).not.toThrow()

    expect(write).toHaveBeenCalledWith(expect.stringContaining('connection reset'))
    write.mockRestore()
  })

  it('queries the database built from DATABASE_URL', async () => {
    const result = await db.execute(sql`select 1 as one`)

    expect(result.rows).toEqual([{ one: 1 }])
  })
})
