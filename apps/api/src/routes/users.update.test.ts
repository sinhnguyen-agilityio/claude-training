import { seedUsers, userSchema, userUpdateSchema } from '@app/shared'
import { eq } from 'drizzle-orm'
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

const anna = seedUser('00000000-0000-4000-8000-000000000001') // has a phone
const ben = seedUser('00000000-0000-4000-8000-000000000002')
const cara = seedUser('00000000-0000-4000-8000-000000000003')
const dave = seedUser('00000000-0000-4000-8000-000000000004')
const erin = seedUser('00000000-0000-4000-8000-000000000005')
const unknownId = '00000000-0000-4000-8000-0000000000ff'

async function stored(id: string) {
  const [row] = await testDb.db.select().from(users).where(eq(users.id, id))
  if (!row) throw new Error(`No row ${id}`)
  return row
}

async function allRows() {
  return testDb.db.select().from(users).orderBy(users.id)
}

function patch(id: string, body?: unknown) {
  const req = request(app).patch(`/api/users/${id}`)
  return body === undefined ? req : req.send(body as object)
}

describe('PATCH /api/users/:id', () => {
  it('changes the given fields and answers the full user with a later updatedAt (AC1)', async () => {
    const res = await patch(erin.id, { firstName: 'Zed' })

    expect(res.status).toBe(200)
    const { updatedAt: _oldUpdatedAt, ...unchanged } = erin
    expect(res.body).toMatchObject({ ...unchanged, firstName: 'Zed' })
    expect(res.body.createdAt).toBe(erin.createdAt)
    expect(Date.parse(res.body.updatedAt)).toBeGreaterThan(Date.parse(erin.updatedAt))
    expect(() => userSchema.parse(res.body)).not.toThrow()
    const row = await stored(erin.id)
    expect(row.firstName).toBe('Zed')
    expect(row.lastName).toBe(erin.lastName)
  })

  it('changes only the row of the given id (AC1)', async () => {
    const rowsBefore = await allRows()

    const res = await patch(dave.id, { lastName: 'Only' })

    expect(res.status).toBe(200)
    const rowsAfter = await allRows()
    expect(rowsAfter).toHaveLength(rowsBefore.length)
    expect(rowsAfter.filter((row) => row.id !== dave.id)).toEqual(
      rowsBefore.filter((row) => row.id !== dave.id),
    )
    expect(rowsAfter.find((row) => row.id === dave.id)?.lastName).toBe('Only')
  })

  it('accepts the exact email of the user itself (AC2)', async () => {
    const res = await patch(cara.id, { email: cara.email, role: 'admin' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ email: cara.email, role: 'admin' })
    expect((await stored(cara.id)).email).toBe(cara.email)
  })

  it('accepts the own email in another letter case and stores it lowercase (AC2)', async () => {
    const res = await patch(ben.id, { email: ben.email.toUpperCase() })

    expect(res.status).toBe(200)
    expect(res.body.email).toBe(ben.email.toLowerCase())
    expect((await stored(ben.id)).email).toBe(ben.email.toLowerCase())
  })

  it('answers 409 with the body of POST for the email of another user (AC3)', async () => {
    const res = await patch(cara.id, { email: dave.email.toUpperCase() })

    expect(res.status).toBe(409)
    expect(res.body).toEqual({
      message: 'Email is already in use',
      fieldErrors: { email: 'Email is already in use' },
    })
    expect((await stored(cara.id)).email).toBe(cara.email)
  })

  it.each([
    ['firstName', ''],
    ['lastName', 'x'.repeat(51)],
    ['email', 'x'],
    ['phone', '12'],
    ['role', 'boss'],
    ['status', 'gone'],
  ])('answers 400 for an invalid %s (AC4)', async (field, value) => {
    const body = { [field]: value }
    const parsed = userUpdateSchema.safeParse(body)
    if (parsed.success) throw new Error('The body should be invalid')

    const res = await patch(anna.id, body)

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      message: 'Validation failed',
      fieldErrors: { [field]: parsed.error.issues[0]?.message },
    })
    expect(await stored(anna.id)).toMatchObject({ firstName: anna.firstName, email: anna.email })
  })

  it.each([
    [unknownId],
    ['abc'],
    ['1;drop table users'],
    ['a'.repeat(300)],
    ['00000000-0000-4000-8000-00000000000'],
  ])('answers 404 for the id %j (AC5)', async (id) => {
    const res = await patch(encodeURIComponent(id), { firstName: 'Zed' })

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'User not found' })
  })

  it('answers 404, not 400, for an id with a broken escape (AC5)', async () => {
    const res = await patch('%zz', { firstName: 'Zed' })

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'User not found' })
  })

  it.each([
    ['an empty object', {}],
    [
      'only ignored keys',
      {
        id: unknownId,
        createdAt: '2000-01-01T00:00:00.000Z',
        updatedAt: '2000-01-01T00:00:00.000Z',
      },
    ],
    ['no body at all', undefined],
  ])('answers 400 "Nothing to update" for %s (AC6)', async (_label, body) => {
    const before = await stored(anna.id)

    const res = await patch(anna.id, body)

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Nothing to update' })
    expect(await stored(anna.id)).toEqual(before)
  })

  it('ignores id, createdAt and updatedAt in the body (AC7)', async () => {
    const sentId = '11111111-1111-4111-8111-111111111111'
    const sentDate = '2000-01-01T00:00:00.000Z'
    const before = await stored(ben.id)

    const res = await patch(ben.id, {
      firstName: 'Bo',
      id: sentId,
      createdAt: sentDate,
      updatedAt: sentDate,
    })

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(ben.id)
    expect(res.body.createdAt).toBe(before.createdAt.toISOString())
    expect(res.body.updatedAt).not.toBe(sentDate)
    expect(Date.parse(res.body.updatedAt)).toBeGreaterThan(before.updatedAt.getTime())
    expect(await testDb.db.select().from(users).where(eq(users.id, sentId))).toHaveLength(0)
  })

  it('reports an invalid body before it looks for the user (AC8)', async () => {
    const invalid = await patch(unknownId, { email: 'x' })
    const empty = await patch(unknownId, {})

    expect(invalid.status).toBe(400)
    expect(invalid.body.message).toBe('Validation failed')
    expect(empty.status).toBe(400)
    expect(empty.body).toEqual({ message: 'Nothing to update' })
  })

  // One user per case, each given a phone first, so a case cannot pass on the work of the other.
  it.each([
    ['', '00000000-0000-4000-8000-000000000008'],
    [null, '00000000-0000-4000-8000-000000000009'],
  ])('clears the phone for %j', async (phone, id) => {
    if (!anna.phone) throw new Error('The seed user anna should have a phone')
    await patch(id, { phone: anna.phone })
    expect((await stored(id)).phone).not.toBeNull()

    const res = await patch(id, { phone })

    expect(res.status).toBe(200)
    expect(res.body.phone).toBeNull()
    expect((await stored(id)).phone).toBeNull()
  })

  it('lets exactly one of two simultaneous updates to the same new email win', async () => {
    const email = 'race.update@example.com'

    const results = await Promise.all([
      patch(seedUser('00000000-0000-4000-8000-000000000006').id, { email }),
      patch(seedUser('00000000-0000-4000-8000-000000000007').id, { email }),
    ])

    expect(results.map((res) => res.status).sort()).toEqual([200, 409])
  })

  it('answers 500 without details when the database fails, never 409', async () => {
    const res = await request(brokenApp).patch(`/api/users/${anna.id}`).send({ firstName: 'Zed' })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })
  })
})
