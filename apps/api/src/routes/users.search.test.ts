import type { UsersPage } from '@app/shared'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { users } from '../db/schema'
import { createTestDb } from '../test/createTestDb'

const testDb = await createTestDb()
const app = createApp({ db: testDb.db })

const sameMoment = new Date('2026-03-01T10:00:00.000Z')

await testDb.db.insert(users).values([
  { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', role: 'viewer' },
  { firstName: 'Johnny', lastName: 'Appleseed', email: 'johnny@example.com', role: 'viewer' },
  { firstName: 'Maria', lastName: 'Johnson', email: 'maria@example.com', role: 'editor' },
  { firstName: 'Sam', lastName: 'Smith', email: 'john.sam@example.com', role: 'admin' },
  // Contains "john d" inside one field; John Doe does not (his name is in two fields).
  { firstName: 'Mary', lastName: 'Saint John Doe', email: 'mary@example.com', role: 'viewer' },
  // Characters that LIKE treats as wildcards.
  { firstName: '100%', lastName: 'Cotton', email: 'cotton@example.com', role: 'viewer' },
  { firstName: 'snake_case', lastName: 'Person', email: 'snake@example.com', role: 'viewer' },
  { firstName: 'Back', lastName: 'Slash\\Name', email: 'back@example.com', role: 'viewer' },
  // The same last name in two letter cases, for the name sort. In the first pair the capital comes
  // first by first name and the lowercase one second; in the second pair it is the other way round.
  // A plain ORDER BY would put one pair in the wrong order whether the collation puts lowercase
  // first (en_US) or capitals first (C), so only lower() gets both right.
  { firstName: 'Amy', lastName: 'Adams', email: 'amy@example.com', role: 'viewer' },
  { firstName: 'Zed', lastName: 'adams', email: 'zed@example.com', role: 'viewer' },
  { firstName: 'Bea', lastName: 'baker', email: 'bea@example.com', role: 'viewer' },
  { firstName: 'Cal', lastName: 'Baker', email: 'cal@example.com', role: 'viewer' },
  // Two users created at the same moment, for the tie on createdAt. The one inserted first has the
  // larger id, so neither the insertion order nor the id order alone gives the expected result.
  {
    id: '00000000-0000-4000-8000-00000000aa02',
    firstName: 'Tie',
    lastName: 'One',
    email: 'tie.one@example.com',
    role: 'viewer',
    createdAt: sameMoment,
  },
  {
    id: '00000000-0000-4000-8000-00000000aa01',
    firstName: 'Tie',
    lastName: 'Two',
    email: 'tie.two@example.com',
    role: 'viewer',
    createdAt: sameMoment,
  },
])

async function search(query: string): Promise<UsersPage> {
  const res = await request(app).get(`/api/users?${query}`)
  expect(res.status).toBe(200)
  return res.body as UsersPage
}

function names(page: UsersPage) {
  return page.data.map((user) => `${user.firstName} ${user.lastName}`).sort()
}

describe('GET /api/users?q=', () => {
  it('matches first name, last name or email without regard to case (AC2)', async () => {
    const page = await search('q=JOHN')

    expect(names(page)).toEqual([
      'John Doe',
      'Johnny Appleseed',
      'Maria Johnson',
      'Mary Saint John Doe',
      'Sam Smith',
    ])
    expect(page.total).toBe(5)
  })

  it('matches each field on its own, so "john d" does not span first and last name (AC2)', async () => {
    const page = await search(`q=${encodeURIComponent('john d')}`)

    expect(names(page)).toEqual(['Mary Saint John Doe'])
  })

  it('trims the search text', async () => {
    expect((await search(`q=${encodeURIComponent('  johnny  ')}`)).total).toBe(1)
  })

  it('combines with the role filter (AC3)', async () => {
    expect(names(await search('q=john&role=admin'))).toEqual(['Sam Smith'])
  })

  it('treats % as a literal character (AC7)', async () => {
    const page = await search(`q=${encodeURIComponent('%')}`)

    expect(names(page)).toEqual(['100% Cotton'])
    expect(page.total).toBe(1)
  })

  it('treats _ as a literal character (AC7)', async () => {
    expect(names(await search(`q=${encodeURIComponent('_')}`))).toEqual(['snake_case Person'])
  })

  it('treats a backslash as a literal character (AC7)', async () => {
    expect(names(await search(`q=${encodeURIComponent('\\')}`))).toEqual(['Back Slash\\Name'])
  })
})

describe('GET /api/users ordering', () => {
  it.each([
    ['adams', ['Amy', 'Zed']],
    ['baker', ['Bea', 'Cal']],
  ])(
    'sorts the last name %s without regard to letter case, then by first name (AC4, A1)',
    async (lastName, firstNames) => {
      const asc = await search(`q=${lastName}&sort=name&order=asc`)
      expect(asc.data.map((user) => user.firstName)).toEqual(firstNames)

      const desc = await search(`q=${lastName}&sort=name&order=desc`)
      expect(desc.data.map((user) => user.firstName)).toEqual([...firstNames].reverse())
    },
  )

  it('breaks a tie on createdAt by id, in the direction of order (A2)', async () => {
    // One has the larger id (aa02) and was inserted first.
    const newestFirst = await search('q=tie&sort=createdAt&order=desc')
    expect(newestFirst.data.map((user) => user.lastName)).toEqual(['One', 'Two'])

    const oldestFirst = await search('q=tie&sort=createdAt&order=asc')
    expect(oldestFirst.data.map((user) => user.lastName)).toEqual(['Two', 'One'])
  })
})
