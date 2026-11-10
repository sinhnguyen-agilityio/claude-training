import { seedUsers } from '@app/shared'
import { eq, inArray } from 'drizzle-orm'
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

// Rows persist across the tests of this file, so each test uses its own seed users.
const ids = seedUsers.map((user) => user.id)
const unknownId = '00000000-0000-4000-8000-0000000000ff'

function bulk(body: unknown) {
  return request(app)
    .post('/api/users/bulk')
    .send(body as object)
}

async function rowsOf(wanted: string[]) {
  return testDb.db.select().from(users).where(inArray(users.id, wanted)).orderBy(users.id)
}

async function allRows() {
  return testDb.db.select().from(users).orderBy(users.id)
}

describe('POST /api/users/bulk', () => {
  it('deletes the existing ids and reports the unknown ones as not_found (AC1, AC5)', async () => {
    const [a, b, c, other] = [ids[0]!, ids[1]!, ids[2]!, ids[3]!]
    const otherBefore = await rowsOf([other])

    const res = await bulk({ action: 'delete', ids: [a, unknownId, b, 'not-a-uuid', c] })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      succeeded: [a, b, c],
      failed: [
        { id: unknownId, reason: 'not_found' },
        { id: 'not-a-uuid', reason: 'not_found' },
      ],
    })
    expect(await rowsOf([a, b, c])).toHaveLength(0)
    expect(await rowsOf([other])).toEqual(otherBefore)
  })

  it('leaves every other row untouched after a delete (AC5)', async () => {
    const target = ids[4]!
    const before = (await allRows()).filter((row) => row.id !== target)

    await bulk({ action: 'delete', ids: [target] })

    expect(await allRows()).toEqual(before)
  })

  it('answers 200 with everything failed when no id exists (AC1)', async () => {
    const res = await bulk({ action: 'delete', ids: [unknownId] })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ succeeded: [], failed: [{ id: unknownId, reason: 'not_found' }] })
  })

  it('removes duplicate ids so each appears once in the response (AC2)', async () => {
    const [a, b] = [ids[5]!, ids[6]!]

    const res = await bulk({ action: 'delete', ids: [a, b, a, unknownId, unknownId, a] })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      succeeded: [a, b],
      failed: [{ id: unknownId, reason: 'not_found' }],
    })
  })

  it('treats ids that differ only in letter case as one id (AC2)', async () => {
    const a = ids[7]!

    const res = await bulk({ action: 'delete', ids: [a, a.toUpperCase()] })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ succeeded: [a], failed: [] })
  })

  it('accepts 500 entries that hold one distinct id (AC3)', async () => {
    const res = await bulk({ action: 'delete', ids: Array<string>(500).fill(unknownId) })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ succeeded: [], failed: [{ id: unknownId, reason: 'not_found' }] })
  })

  it('accepts exactly 50 distinct ids (AC3)', async () => {
    const fifty = Array.from({ length: 50 }, (_, i) => `missing-${i}`)

    const res = await bulk({ action: 'delete', ids: fifty })

    expect(res.status).toBe(200)
    expect(res.body.failed).toHaveLength(50)
  })

  const fiftyOne = Array.from({ length: 51 }, (_, i) => `id-${i}`)
  const invalid: [string, unknown, string][] = [
    ['empty ids', { action: 'delete', ids: [] }, 'ids'],
    ['missing ids', { action: 'delete' }, 'ids'],
    ['ids that is not an array', { action: 'delete', ids: 'abc' }, 'ids'],
    ['51 distinct ids', { action: 'delete', ids: fiftyOne }, 'ids'],
    ['501 entries', { action: 'delete', ids: Array<string>(501).fill('same') }, 'ids'],
    ['an empty id', { action: 'delete', ids: ['a', ''] }, 'ids.1'],
    ['a non-string id', { action: 'delete', ids: ['a', 7] }, 'ids.1'],
    ['an unknown action', { action: 'archive', ids: ['a'] }, 'action'],
    ['a missing action', { ids: ['a'] }, 'action'],
    ['setStatus without status', { action: 'setStatus', ids: ['a'] }, 'status'],
    ['setStatus with a bad status', { action: 'setStatus', ids: ['a'], status: 'x' }, 'status'],
  ]

  it.each(invalid)('answers 400 for %s (AC3)', async (_name, body, field) => {
    const before = await allRows()

    const res = await bulk(body)

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Validation failed')
    expect(res.body.fieldErrors).toHaveProperty([field])
    expect(await allRows()).toEqual(before)
  })

  it('answers 400 for a request with no body (AC3)', async () => {
    const res = await request(app).post('/api/users/bulk')

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Validation failed')
  })

  it('sets the status and moves updatedAt of every user it reaches (AC4)', async () => {
    const [changing, same, untouched] = [ids[8]!, ids[9]!, ids[10]!]
    await testDb.db.update(users).set({ status: 'active' }).where(eq(users.id, same))
    await testDb.db.update(users).set({ status: 'active' }).where(eq(users.id, changing))
    const before = await rowsOf([changing, same, untouched])

    const res = await bulk({
      action: 'setStatus',
      ids: [changing, same, unknownId],
      status: 'inactive',
    })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      succeeded: [changing, same],
      failed: [{ id: unknownId, reason: 'not_found' }],
    })
    const after = await rowsOf([changing, same, untouched])
    const find = (rows: typeof after, id: string) => rows.find((row) => row.id === id)!
    for (const id of [changing, same]) {
      expect(find(after, id).status).toBe('inactive')
      expect(find(after, id).updatedAt.getTime()).toBeGreaterThan(
        find(before, id).updatedAt.getTime(),
      )
      expect(find(after, id).createdAt).toEqual(find(before, id).createdAt)
    }
    expect(find(after, untouched)).toEqual(find(before, untouched))
  })

  it('moves updatedAt for a user who already had the requested status (AC4)', async () => {
    const id = ids[11]!
    await testDb.db.update(users).set({ status: 'active' }).where(eq(users.id, id))
    const [before] = await rowsOf([id])

    const res = await bulk({ action: 'setStatus', ids: [id], status: 'active' })

    const [after] = await rowsOf([id])
    expect(res.body).toEqual({ succeeded: [id], failed: [] })
    expect(after!.updatedAt.getTime()).toBeGreaterThan(before!.updatedAt.getTime())
  })

  it('ignores a stray status on delete (A2)', async () => {
    const id = ids[12]!

    const res = await bulk({ action: 'delete', ids: [id], status: 'nonsense' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ succeeded: [id], failed: [] })
    expect(await rowsOf([id])).toHaveLength(0)
  })

  it('keeps the request order of first occurrences in both arrays (A3)', async () => {
    const [a, b, c] = [ids[13]!, ids[14]!, ids[15]!]

    const res = await bulk({
      action: 'setStatus',
      ids: [c, 'z-missing', a, c, 'a-missing', b, a],
      status: 'active',
    })

    expect(res.body).toEqual({
      succeeded: [c, a, b],
      failed: [
        { id: 'z-missing', reason: 'not_found' },
        { id: 'a-missing', reason: 'not_found' },
      ],
    })
  })

  it('checks the 500-entry cap before removing duplicates and the 50-id cap after (A4)', async () => {
    const identical = await bulk({ action: 'delete', ids: Array<string>(501).fill(unknownId) })
    const fifty = Array.from({ length: 50 }, (_, i) => `m-${i}`)
    const manyDuplicates = await bulk({ action: 'delete', ids: [...fifty, ...fifty, ...fifty] })

    expect(identical.status).toBe(400)
    expect(manyDuplicates.status).toBe(200)
  })

  it('does not take /bulk for a user id on GET and DELETE', async () => {
    const before = await allRows()

    const get = await request(app).get('/api/users/bulk')
    const del = await request(app).delete('/api/users/bulk')

    expect(get.status).toBe(404)
    expect(del.status).toBe(404)
    expect(await allRows()).toEqual(before)
  })

  it('answers 500 when the database fails', async () => {
    const res = await request(brokenApp)
      .post('/api/users/bulk')
      .send({ action: 'delete', ids: [ids[0]] })

    expect(res.status).toBe(500)
  })
})
