import { seedUsers } from '@app/shared'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { users } from '../db/schema'
import { seedDatabase } from '../db/seed'
import { createTestDb } from '../test/createTestDb'

const testDb = await createTestDb({ seed: true })
const app = createApp({ db: testDb.db, allowReset: true })

// Rows as the table stores them, in a fixed order, to compare before and after a request.
async function allRows() {
  return testDb.db.select().from(users).orderBy(users.id)
}

const seedRows = (await allRows()).map((row) => ({ ...row }))

/** Creates, updates and deletes through the API, so the table no longer matches the seed. */
async function dirtyTheTable() {
  const [first, second] = seedUsers
  if (!first || !second) throw new Error('The seed has fewer than two users')
  const created = await request(app).post('/api/users').send({
    firstName: 'Reset',
    lastName: 'Tester',
    email: 'reset.tester@example.com',
    phone: '+1 555 0100',
    role: 'viewer',
    status: 'active',
  })
  expect(created.status).toBe(201)
  expect(
    (await request(app).patch(`/api/users/${first.id}`).send({ firstName: 'Renamed' })).status,
  ).toBe(200)
  expect((await request(app).delete(`/api/users/${second.id}`)).status).toBe(204)
}

describe('POST /api/reset', () => {
  // Each test starts from the seed, whatever the one before it did.
  beforeEach(async () => {
    await seedDatabase(testDb.db)
  })

  it('restores exactly the 25 seed users after creates, updates and deletes (AC1)', async () => {
    await dirtyTheTable()
    expect(await allRows()).not.toEqual(seedRows)

    const res = await request(app).post('/api/reset')

    expect(res.status).toBe(204)
    expect(res.text).toBe('')
    const rows = await allRows()
    expect(rows).toHaveLength(25)
    expect(rows).toEqual(seedRows)
    expect(rows.map((row) => row.id)).toEqual(seedUsers.map((user) => user.id).sort())
  })

  it('ignores a request body (A5)', async () => {
    await dirtyTheTable()

    const res = await request(app).post('/api/reset').send({ firstName: 'x', users: [] })

    expect(res.status).toBe(204)
    expect(await allRows()).toEqual(seedRows)
  })

  it('gives the same result when it runs twice in a row (AC4)', async () => {
    await dirtyTheTable()

    const first = await request(app).post('/api/reset')
    const afterFirst = await allRows()
    const second = await request(app).post('/api/reset')
    const afterSecond = await allRows()

    expect(first.status).toBe(204)
    expect(second.status).toBe(204)
    expect(afterSecond).toEqual(afterFirst)
    expect(afterSecond).toEqual(seedRows)
  })

  it.each([
    ['unset', undefined],
    ['false', false],
  ])('answers 404 and keeps the rows when allowReset is %s (AC3)', async (_label, allowReset) => {
    const closedApp = createApp({ db: testDb.db, allowReset })
    await dirtyTheTable()
    const before = await allRows()

    const res = await request(closedApp).post('/api/reset')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Not found' })
    expect(await allRows()).toEqual(before)
  })

  it('answers 404 when allowReset is true but there is no database (AC3)', async () => {
    const res = await request(createApp({ allowReset: true })).post('/api/reset')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Not found' })
  })

  it('answers 500 and leaves the original rows when the insert fails (AC2)', async () => {
    await dirtyTheTable()
    const before = await allRows()
    // The delete of the reset succeeds, then the first insert raises: the transaction must roll back.
    await testDb.pool.query(
      `CREATE FUNCTION refuse_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'insert refused'; END $$`,
    )
    await testDb.pool.query(
      'CREATE TRIGGER refuse_insert BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION refuse_insert()',
    )

    try {
      const res = await request(app).post('/api/reset')

      expect(res.status).toBe(500)
      expect(res.body).toEqual({ message: 'Internal server error' })
      expect(await allRows()).toEqual(before)
    } finally {
      await testDb.pool.query('DROP TRIGGER refuse_insert ON users')
      await testDb.pool.query('DROP FUNCTION refuse_insert()')
    }

    // With the trigger gone the same endpoint works again.
    expect((await request(app).post('/api/reset')).status).toBe(204)
    expect(await allRows()).toEqual(seedRows)
  })
})
