import { seedUsers, userCreateSchema, userSchema } from '@app/shared'
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

const padded = {
  firstName: ' Ann ',
  lastName: 'Lee',
  email: ' ANN@Example.com ',
  phone: '',
  role: 'viewer',
}

async function countUsers(): Promise<number> {
  const [row] = await testDb.db.select({ value: count() }).from(users)
  return row?.value ?? 0
}

describe('POST /api/users', () => {
  it('creates the user: trimmed, lowercase email, null phone, active, UUID id (AC1)', async () => {
    const before = await countUsers()

    const res = await request(app).post('/api/users').send(padded)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      firstName: 'Ann',
      lastName: 'Lee',
      email: 'ann@example.com',
      phone: null,
      role: 'viewer',
      status: 'active',
    })
    expect(res.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(res.body.createdAt).toBe(res.body.updatedAt)
    expect(() => userSchema.parse(res.body)).not.toThrow()
    expect(await countUsers()).toBe(before + 1)
    const [stored] = await testDb.db.select().from(users).where(eq(users.id, res.body.id))
    expect(stored?.email).toBe('ann@example.com')
  })

  it('answers 400 with an entry for each of the five bad fields (AC2)', async () => {
    const before = await countUsers()
    const body = { firstName: '', lastName: 'x'.repeat(51), email: 'x', phone: '12', role: 'boss' }

    const res = await request(app).post('/api/users').send(body)

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Validation failed')
    expect(Object.keys(res.body.fieldErrors).sort()).toEqual(
      ['email', 'firstName', 'lastName', 'phone', 'role'].sort(),
    )
    expect(await countUsers()).toBe(before)
  })

  it('answers 400 for a request with no body instead of crashing', async () => {
    const res = await request(app).post('/api/users')

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Validation failed')
    expect(Object.keys(res.body.fieldErrors)).toEqual(
      expect.arrayContaining(['firstName', 'lastName', 'email', 'role']),
    )
  })

  it('answers 409 for an email that exists in another letter case (AC3)', async () => {
    const existing = seedUsers[0]
    if (!existing) throw new Error('No seed user')
    const before = await countUsers()

    const res = await request(app)
      .post('/api/users')
      .send({ ...padded, email: existing.email.toUpperCase() })

    expect(res.status).toBe(409)
    expect(res.body).toEqual({
      message: 'Email is already in use',
      fieldErrors: { email: 'Email is already in use' },
    })
    expect(await countUsers()).toBe(before)
  })

  it('lets exactly one of two simultaneous requests with the same new email win (AC4)', async () => {
    const body = { ...padded, email: 'race@example.com' }

    const results = await Promise.all([
      request(app).post('/api/users').send(body),
      request(app).post('/api/users').send(body),
    ])

    expect(results.map((res) => res.status).sort()).toEqual([201, 409])
    const rows = await testDb.db.select().from(users).where(eq(users.email, 'race@example.com'))
    expect(rows).toHaveLength(1)
  })

  it('ignores id and timestamps sent in the body (AC5)', async () => {
    const sentId = '11111111-1111-4111-8111-111111111111'

    const res = await request(app)
      .post('/api/users')
      .send({
        ...padded,
        email: 'extra@example.com',
        id: sentId,
        createdAt: '2000-01-01T00:00:00.000Z',
        updatedAt: '2000-01-01T00:00:00.000Z',
      })

    expect(res.status).toBe(201)
    expect(res.body.id).not.toBe(sentId)
    expect(res.body.createdAt).not.toBe('2000-01-01T00:00:00.000Z')
    const stored = await testDb.db.select().from(users).where(eq(users.id, sentId))
    expect(stored).toHaveLength(0)
  })

  it('reports the same messages as the shared userCreateSchema (AC6)', async () => {
    const body = { firstName: '', lastName: '', email: 'x', phone: '12', role: 'boss' }
    const parsed = userCreateSchema.safeParse(body)
    if (parsed.success) throw new Error('The body should be invalid')
    const expected: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      expected[issue.path.join('.')] ??= issue.message
    }

    const res = await request(app).post('/api/users').send(body)

    expect(res.body.fieldErrors).toEqual(expected)
  })

  it('answers 500 without details when the database fails, never 409', async () => {
    const res = await request(brokenApp).post('/api/users').send(padded)

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })
  })
})
