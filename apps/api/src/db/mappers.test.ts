import { seedUsers, userSchema } from '@app/shared'
import { describe, expect, it } from 'vitest'
import { createTestDb } from '../test/createTestDb'
import { sortById } from '../test/sortById'
import { toUser } from './mappers'
import { users, type UserRow } from './schema'

const testDb = await createTestDb({ seed: true })

const row: UserRow = {
  id: '00000000-0000-4000-8000-000000000099',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: null,
  role: 'editor',
  status: 'active',
  createdAt: new Date('2026-02-03T04:05:06.789Z'),
  updatedAt: new Date('2026-02-04T05:06:07.000Z'),
}

describe('toUser', () => {
  it('writes the dates as ISO 8601 strings', () => {
    const user = toUser(row)

    expect(user.createdAt).toBe('2026-02-03T04:05:06.789Z')
    expect(user.updatedAt).toBe('2026-02-04T05:06:07.000Z')
  })

  it('keeps a missing phone as null and a phone as a string', () => {
    expect(toUser(row).phone).toBeNull()
    expect(toUser({ ...row, phone: '+84 90 123 4567' }).phone).toBe('+84 90 123 4567')
  })

  it('maps the seed rows stored in Postgres to exactly the shared seed', async () => {
    const rows = await testDb.db.select().from(users)
    const mapped = sortById(rows.map(toUser))

    expect(mapped).toEqual(sortById(seedUsers))
    expect(() => userSchema.array().parse(mapped)).not.toThrow()
  })
})
