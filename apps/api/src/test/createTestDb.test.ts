import { count } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { users } from '../db/schema'
import { createTestDb, moveToSchema } from './createTestDb'

// Two databases in one file stand in for two test files running in parallel.
const seeded = await createTestDb({ seed: true })
const empty = await createTestDb()

async function countUsers(testDb: typeof seeded) {
  const [result] = await testDb.db.select({ value: count() }).from(users)
  return result?.value
}

describe('createTestDb', () => {
  it('gives each call its own schema', () => {
    expect(seeded.schema).not.toBe(empty.schema)
    expect(seeded.schema).toMatch(/^test_[0-9a-f]{16}$/)
  })

  it('migrates every schema and seeds only when asked', async () => {
    expect(await countUsers(seeded)).toBe(25)
    expect(await countUsers(empty)).toBe(0)
  })

  it('keeps the rows of one schema away from the other', async () => {
    await empty.db.insert(users).values({
      firstName: 'Only',
      lastName: 'Here',
      email: 'only.here@example.com',
      role: 'viewer',
    })

    expect(await countUsers(empty)).toBe(1)
    expect(await countUsers(seeded)).toBe(25)
  })

  it('allows the same email in two schemas', async () => {
    await empty.db.insert(users).values({
      firstName: 'Twin',
      lastName: 'Email',
      email: 'anna.kowalski@example.com',
      role: 'viewer',
    })

    expect(await countUsers(empty)).toBe(2)
  })

  it('moves the enum types a migration qualifies with public into the test schema', () => {
    expect(moveToSchema(`CREATE TYPE "public"."user_role" AS ENUM('admin')`, 'test_ab')).toBe(
      `CREATE TYPE "test_ab"."user_role" AS ENUM('admin')`,
    )
    expect(moveToSchema('CREATE TABLE "users" ("id" uuid)', 'test_ab')).toBe(
      'CREATE TABLE "users" ("id" uuid)',
    )
  })

  it.each([
    'ALTER TABLE public.users ADD COLUMN x int',
    'CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public',
  ])('refuses a statement that still names the public schema: %s', (statement) => {
    expect(() => moveToSchema(statement, 'test_ab')).toThrow(/public schema/)
  })

  it('drops the schema when asked, and a second drop does nothing', async () => {
    const scratch = await createTestDb()
    const exists = async () => {
      const { rows } = await seeded.pool.query(
        'SELECT 1 FROM information_schema.schemata WHERE schema_name = $1',
        [scratch.schema],
      )
      return rows.length === 1
    }
    expect(await exists()).toBe(true)

    await scratch.drop()
    await scratch.drop()

    expect(await exists()).toBe(false)
  })
})
