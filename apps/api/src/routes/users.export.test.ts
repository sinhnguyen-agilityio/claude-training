import type { User, UsersExport, UsersPage } from '@app/shared'
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

async function exportUsers(query = '') {
  const res = await request(app).get(`/api/users/export${query}`)
  return { status: res.status, body: res.body as UsersExport }
}

async function listUsers(query = '') {
  const res = await request(app).get(`/api/users${query}`)
  return { status: res.status, body: res.body as UsersPage }
}

/** Every page of the list for `query`, concatenated. */
async function listAll(query: string): Promise<User[]> {
  const all: User[] = []
  for (let page = 1; ; page++) {
    const { body } = await listUsers(`?${query}&page=${page}&pageSize=7`)
    all.push(...body.data)
    if (all.length >= body.total) return all
  }
}

describe('GET /api/users/export (the seed data)', () => {
  it('returns all 25 users, newest first, with total 25 (AC1)', async () => {
    const { status, body } = await exportUsers()

    expect(status).toBe(200)
    expect(body.total).toBe(25)
    expect(body.data).toHaveLength(25)
    expect(Object.keys(body).sort()).toEqual(['data', 'total'])
    const times = body.data.map((user) => Date.parse(user.createdAt))
    expect(times).toEqual([...times].sort((a, b) => b - a))
  })

  it.each([
    ['q', 'q=an'],
    ['role', 'role=admin'],
    ['status', 'status=inactive'],
    ['sort name asc', 'sort=name&order=asc'],
    ['sort name desc', 'sort=name&order=desc'],
    ['sort createdAt asc', 'sort=createdAt&order=asc'],
    ['all filters together', 'q=a&role=editor&status=active&sort=name&order=asc'],
  ])('matches the list pages concatenated for %s (AC2)', async (_name, query) => {
    const exported = await exportUsers(`?${query}`)

    const listed = await listAll(query)

    expect(exported.status).toBe(200)
    expect(exported.body.data).toEqual(listed)
    expect(exported.body.total).toBe(listed.length)
    expect(exported.body.total).toBe(exported.body.data.length)
  })

  it('answers 200 with an empty list and total 0 when nothing matches (AC2)', async () => {
    const { status, body } = await exportUsers('?q=zzzzzz-nobody')

    expect(status).toBe(200)
    expect(body).toEqual({ data: [], total: 0 })
  })

  it.each(['page=2&pageSize=5', 'page=0', 'pageSize=999', 'pageSize=abc', 'page=-3&pageSize=0'])(
    'ignores paging parameters, even garbage: %s (AC3, A1)',
    async (query) => {
      const { status, body } = await exportUsers(`?${query}`)

      expect(status).toBe(200)
      expect(body.total).toBe(25)
      expect(body.data).toHaveLength(25)
    },
  )

  it.each(['role=boss', 'status=gone', 'sort=email', 'order=sideways'])(
    'answers 400 with the same body as the list for %s (AC4)',
    async (query) => {
      const exported = await request(app).get(`/api/users/export?${query}`)
      const listed = await request(app).get(`/api/users?${query}`)

      expect(exported.status).toBe(400)
      expect(exported.body.message).toBe('Validation failed')
      expect(exported.body).toEqual(listed.body)
    },
  )

  it('is not taken for a user id (it is registered above /:id)', async () => {
    const res = await request(app).get('/api/users/export')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
  })

  it('answers 500 when the database fails', async () => {
    const res = await request(brokenApp).get('/api/users/export')

    expect(res.status).toBe(500)
  })
})

describe('GET /api/users/export (no row cap)', () => {
  it('returns all 120 rows, where the list would stop at 50 per page', async () => {
    const extra = Array.from({ length: 95 }, (_, i) => ({
      firstName: `Extra${i}`,
      lastName: `Person${i}`,
      email: `extra${i}@example.com`,
      role: 'viewer' as const,
    }))
    await testDb.db.insert(users).values(extra)

    const { status, body } = await exportUsers('?page=1&pageSize=5')

    expect(status).toBe(200)
    expect(body.total).toBe(120)
    expect(body.data).toHaveLength(120)
    expect(new Set(body.data.map((user) => user.id)).size).toBe(120)
  })
})
