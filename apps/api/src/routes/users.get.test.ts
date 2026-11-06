import { seedUsers, userSchema } from '@app/shared'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { createTestDb } from '../test/createTestDb'

const testDb = await createTestDb({ seed: true })
const app = createApp({ db: testDb.db })

function seedUser(id: string) {
  const user = seedUsers.find((candidate) => candidate.id === id)
  if (!user) throw new Error(`No seed user ${id}`)
  return user
}

const anna = seedUser('00000000-0000-4000-8000-000000000001') // has a phone
const lan = seedUser('00000000-0000-4000-8000-000000000003') // has no phone

describe('GET /api/users/:id', () => {
  it('returns 200 with the user, as the shared User schema describes it (AC1)', async () => {
    const res = await request(app).get(`/api/users/${anna.id}`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual(anna)
    expect(() => userSchema.parse(res.body)).not.toThrow()
    expect(res.body.createdAt).toBe('2026-01-01T09:00:00.000Z')
    expect(res.body.phone).toBe('+48 22 123 4567')
  })

  it('returns phone as null when the user has none (AC1)', async () => {
    const res = await request(app).get(`/api/users/${lan.id}`)

    expect(res.status).toBe(200)
    expect(res.body.phone).toBeNull()
    expect(res.body).toEqual(lan)
  })

  it('answers the same user for the id in capital letters', async () => {
    const res = await request(app).get(`/api/users/${anna.id.toUpperCase()}`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual(anna)
  })

  it('answers 404 { message: "User not found" } for a UUID nobody has (AC2)', async () => {
    const res = await request(app).get('/api/users/00000000-0000-4000-8000-0000000000ff')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'User not found' })
  })

  it.each([
    ['abc'],
    ['123'],
    ['null'],
    ['not-a-uuid-but-with-thirty-six-chars!'],
    ['00000000-0000-4000-8000-00000000000'],
    ['00000000-0000-4000-8000-0000000000011'],
    ['00000000000040008000000000000001'],
    ['1;drop table users'],
    ["' or '1'='1"],
    ['%20'],
    ['a'.repeat(300)],
  ])('answers the same 404 for the id %j, never 400 or 500 (AC3)', async (id) => {
    const res = await request(app).get(`/api/users/${encodeURIComponent(id)}`)

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'User not found' })
  })

  // These are sent as they are, not through encodeURIComponent: Express cannot decode the id, and
  // used to answer 400 "Bad request" before any code of the API ran.
  it.each([['%'], ['%zz'], ['%E0%A4%A'], ['%C3%28'], ['abc%']])(
    'answers the same 404 for the malformed escape %s in the id, never 400 (AC3)',
    async (id) => {
      const res = await request(app).get(`/api/users/${id}`)

      expect(res.status).toBe(404)
      expect(res.body).toEqual({ message: 'User not found' })
    },
  )

  it('still answers 500 without details for an error that is not a broken escape', async () => {
    // A schema of its own whose users table is gone: the query fails the way a down database would.
    // createTestDb() registers its cleanup with afterAll, which does nothing when it is called from
    // inside a test, so this test drops the schema itself.
    const broken = await createTestDb()
    try {
      await broken.pool.query('DROP TABLE users')

      const res = await request(createApp({ db: broken.db })).get(`/api/users/${anna.id}`)

      expect(res.status).toBe(500)
      expect(res.body).toEqual({ message: 'Internal server error' })
    } finally {
      await broken.drop()
    }
  })

  it('does not change the list (the id route comes after it)', async () => {
    const res = await request(app).get('/api/users')

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(25)
  })
})
