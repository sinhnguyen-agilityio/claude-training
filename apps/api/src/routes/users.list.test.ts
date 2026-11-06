import { seedUsers, type UsersPage } from '@app/shared'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { createTestDb } from '../test/createTestDb'

const testDb = await createTestDb({ seed: true })
const app = createApp({ db: testDb.db })

async function list(query = ''): Promise<{ status: number; body: UsersPage }> {
  const res = await request(app).get(`/api/users${query}`)
  return { status: res.status, body: res.body as UsersPage }
}

const lastNamesAscending = [
  'Andersson',
  'Baker',
  'Bello',
  'Brown',
  'Clark',
  'Cohen',
  'Dubois',
  'Fernandez',
  'Garcia',
  'Johnson',
  'Khan',
  'Kowalski',
  'Lee',
  'Martin',
  'Nguyen',
  'Nguyen',
  "O'Brien",
  'Rossi',
  'Schneider',
  'Sharma',
  'Smith',
  'Tanaka',
  'Taylor',
  'Wilson',
  'Wright',
]

describe('GET /api/users', () => {
  it('returns the first page of the seed data, newest createdAt first (AC1)', async () => {
    const { status, body } = await list()

    expect(status).toBe(200)
    expect(body.total).toBe(25)
    expect(body.page).toBe(1)
    expect(body.pageSize).toBe(10)
    // The seed users were created on 2026-01-01 .. 2026-01-25, so the newest are 25 down to 16.
    const newestTen = [...seedUsers]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10)
    expect(body.data).toEqual(newestTen)
  })

  it('combines q, role and status with AND (AC3)', async () => {
    const activeAdmins = await list('?q=an&role=admin&status=active')
    expect(activeAdmins.body.data.map((user) => user.firstName).sort()).toEqual(['Anna', 'Hannah'])
    expect(activeAdmins.body.total).toBe(2)

    const inactiveAdmins = await list('?q=an&role=admin&status=inactive')
    expect(inactiveAdmins.body.data.map((user) => user.firstName)).toEqual(['Kenji'])
  })

  it('filters by role or by status alone', async () => {
    expect((await list('?role=admin')).body.total).toBe(5)
    expect((await list('?status=inactive')).body.total).toBe(6)
  })

  it('sorts by last name, then first name, then id (AC4)', async () => {
    const asc = await list('?sort=name&order=asc&pageSize=50')
    expect(asc.body.data.map((user) => user.lastName)).toEqual(lastNamesAscending)
    // The two Nguyens are told apart by first name.
    expect(
      asc.body.data.filter((user) => user.lastName === 'Nguyen').map((user) => user.firstName),
    ).toEqual(['Lan', 'Minh'])

    const desc = await list('?sort=name&order=desc&pageSize=50')
    expect(desc.body.data.map((user) => user.lastName)).toEqual([...lastNamesAscending].reverse())
  })

  it('sorts by createdAt ascending when asked', async () => {
    const { body } = await list('?sort=createdAt&order=asc&pageSize=3')

    expect(body.data.map((user) => user.createdAt)).toEqual([
      '2026-01-01T09:00:00.000Z',
      '2026-01-02T09:00:00.000Z',
      '2026-01-03T09:00:00.000Z',
    ])
  })

  it('pages through the users (AC5)', async () => {
    const third = await list('?page=3&pageSize=10')
    expect(third.status).toBe(200)
    expect(third.body.data).toHaveLength(5)
    expect(third.body.total).toBe(25)
    expect(third.body.page).toBe(3)

    const ids = new Set<string>()
    for (const page of [1, 2, 3]) {
      for (const user of (await list(`?page=${page}`)).body.data) ids.add(user.id)
    }
    expect(ids.size).toBe(25)
  })

  it('answers a page past the end with 200 and no users (AC5)', async () => {
    const past = await list('?page=4')
    expect(past.status).toBe(200)
    expect(past.body.data).toEqual([])
    expect(past.body.total).toBe(25)

    // The largest safe integer page: the offset is never sent to Postgres.
    const huge = await list('?page=9007199254740991&pageSize=50')
    expect(huge.status).toBe(200)
    expect(huge.body.data).toEqual([])
    expect(huge.body.total).toBe(25)
  })

  it('answers an empty list with total 0 when nothing matches', async () => {
    const { status, body } = await list('?q=nobody-has-this-name')

    expect(status).toBe(200)
    expect(body).toEqual({ data: [], total: 0, page: 1, pageSize: 10 })
  })

  it.each([
    ['pageSize', '51'],
    ['pageSize', '0'],
    ['page', '0'],
    ['page', 'abc'],
    ['page', '99999999999999999999'],
    ['role', 'boss'],
    ['status', 'x'],
    ['sort', 'email'],
    ['order', 'up'],
    // A NUL byte: Postgres cannot compare it, so it must not reach the query.
    ['q', '%00'],
  ])('answers 400 for %s=%s and names the parameter (AC6)', async (name, value) => {
    const res = await request(app).get(`/api/users?${name}=${value}`)

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Validation failed')
    expect(Object.keys(res.body.fieldErrors)).toEqual([name])
    expect(typeof res.body.fieldErrors[name]).toBe('string')
  })

  it('answers 400 when a parameter is repeated', async () => {
    const res = await request(app).get('/api/users?q=a&q=b')

    expect(res.status).toBe(400)
    expect(Object.keys(res.body.fieldErrors)).toEqual(['q'])
  })
})
