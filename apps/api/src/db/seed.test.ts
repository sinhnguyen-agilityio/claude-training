import { seedUsers } from '@app/shared'
import { count } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createTestDb } from '../test/createTestDb'
import { sortById } from '../test/sortById'
import { toUser } from './mappers'
import { seedDatabase } from './seed'
import { users } from './schema'

const testDb = await createTestDb()

async function countUsers() {
  const [result] = await testDb.db.select({ value: count() }).from(users)
  return result?.value
}

describe('seedDatabase', () => {
  it('stores the 25 users of @app/shared with the same ids and values', async () => {
    await seedDatabase(testDb.db)

    const rows = await testDb.db.select().from(users)
    expect(sortById(rows.map(toUser))).toEqual(sortById(seedUsers))
  })

  it('still leaves 25 users when it runs again', async () => {
    await seedDatabase(testDb.db)
    await seedDatabase(testDb.db)

    expect(await countUsers()).toBe(25)
  })

  it('replaces the rows, so a user added since is gone', async () => {
    await testDb.db.insert(users).values({
      firstName: 'Extra',
      lastName: 'User',
      email: 'extra@example.com',
      role: 'viewer',
    })
    expect(await countUsers()).toBe(26)

    await seedDatabase(testDb.db)

    expect(await countUsers()).toBe(25)
  })

  it('rolls back and keeps the old rows when the insert fails', async () => {
    await seedDatabase(testDb.db)
    await testDb.db.insert(users).values({
      firstName: 'Keep',
      lastName: 'Me',
      email: 'keep.me@example.com',
      role: 'viewer',
    })
    // NOT VALID spares the rows already stored, but rejects the admins in the seed after the delete ran.
    await testDb.pool.query(
      `ALTER TABLE users ADD CONSTRAINT no_admin CHECK (role <> 'admin') NOT VALID`,
    )

    await expect(seedDatabase(testDb.db)).rejects.toThrow()
    await testDb.pool.query(`ALTER TABLE users DROP CONSTRAINT no_admin`)

    expect(await countUsers()).toBe(26)
  })
})
