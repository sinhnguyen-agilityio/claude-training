import { seedUsers } from '@app/shared'
import { count, eq } from 'drizzle-orm'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { users } from '../db/schema'
import { createTestDb } from '../test/createTestDb'

const testDb = await createTestDb({ seed: true })
const app = createApp({ db: testDb.db })

// A schema whose users table is gone: every query fails the way a down database would.
const brokenDb = await createTestDb()
await brokenDb.pool.query('DROP TABLE users')
const brokenApp = createApp({ db: brokenDb.db })

function seedUser(id: string) {
  const user = seedUsers.find((candidate) => candidate.id === id)
  if (!user) throw new Error(`No seed user ${id}`)
  return user
}

// Rows persist across the tests of this file, so each test deletes a different seed user.
const anna = seedUser('00000000-0000-4000-8000-000000000001')
const ben = seedUser('00000000-0000-4000-8000-000000000002')
const cara = seedUser('00000000-0000-4000-8000-000000000003')
const dave = seedUser('00000000-0000-4000-8000-000000000004')
const erin = seedUser('00000000-0000-4000-8000-000000000005')
const unknownId = '00000000-0000-4000-8000-0000000000ff'

async function allRows() {
  return testDb.db.select().from(users).orderBy(users.id)
}

async function rowCount() {
  const [counted] = await testDb.db.select({ value: count() }).from(users)
  return counted?.value ?? 0
}

function remove(id: string) {
  return request(app).delete(`/api/users/${id}`)
}

describe('DELETE /api/users/:id', () => {
  it('answers 204 with an empty body and removes the row (AC1)', async () => {
    const before = await rowCount()

    const res = await remove(anna.id)

    expect(res.status).toBe(204)
    expect(res.text).toBe('')
    expect(await rowCount()).toBe(before - 1)
    expect(await testDb.db.select().from(users).where(eq(users.id, anna.id))).toHaveLength(0)
  })

  it('answers 404 to a later GET and a second DELETE of the same id (AC2)', async () => {
    expect((await remove(ben.id)).status).toBe(204)

    const get = await request(app).get(`/api/users/${ben.id}`)
    const again = await remove(ben.id)

    expect(get.status).toBe(404)
    expect(get.body).toEqual({ message: 'User not found' })
    expect(again.status).toBe(404)
    expect(again.body).toEqual({ message: 'User not found' })
  })

  it('answers 404 for an id that never existed (AC2)', async () => {
    const before = await rowCount()

    const res = await remove(unknownId)

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'User not found' })
    expect(await rowCount()).toBe(before)
  })

  it.each([
    ['a word', 'abc'],
    ['an injection-style string', encodeURIComponent('1;drop table users')],
    ['a 300-character id', 'a'.repeat(300)],
    ['a broken escape', '%zz'],
  ])('answers 404 for %s and deletes nothing (AC3)', async (_label, rawPath) => {
    const before = await rowCount()

    const res = await remove(rawPath)

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'User not found' })
    expect(await rowCount()).toBe(before)
  })

  it('deletes the user for an uppercase UUID (AC3)', async () => {
    const res = await remove(cara.id.toUpperCase())

    expect(res.status).toBe(204)
    expect(await testDb.db.select().from(users).where(eq(users.id, cara.id))).toHaveLength(0)
  })

  it('removes only the row of the given id (AC4)', async () => {
    const rowsBefore = await allRows()

    const res = await remove(dave.id)

    expect(res.status).toBe(204)
    const rowsAfter = await allRows()
    expect(rowsAfter).toHaveLength(rowsBefore.length - 1)
    expect(rowsAfter).toEqual(rowsBefore.filter((row) => row.id !== dave.id))
  })

  it('answers 500 without details when the database fails', async () => {
    const res = await request(brokenApp).delete(`/api/users/${erin.id}`)

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })
  })
})
