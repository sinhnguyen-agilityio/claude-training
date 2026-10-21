import { describe, expect, it } from 'vitest'
import type { User } from '@/features/users/schema'
import { seedUsers } from '@/mocks/seed'

const anna = seedUsers[0]!

function api(path: string, init?: RequestInit & { json?: unknown }) {
  const { json, ...rest } = init ?? {}
  return fetch(new URL(path, location.origin), {
    ...rest,
    headers: json === undefined ? rest.headers : { 'Content-Type': 'application/json' },
    body: json === undefined ? rest.body : JSON.stringify(json),
  })
}

const validBody = {
  firstName: ' Zoe ',
  lastName: 'Adams',
  email: 'Zoe.Adams@Example.com',
  role: 'viewer',
}

describe('GET /api/users', () => {
  it('returns the first page with defaults', async () => {
    const response = await api('/api/users')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ total: 25, page: 1, pageSize: 10 })
    expect(body.data).toHaveLength(10)
  })

  it('applies search, filters, sort and paging from the query string', async () => {
    // Editors matching "an": Joanne Baker and Fatima Khan.
    const response = await api('/api/users?q=an&role=editor&sort=name&order=asc&pageSize=1&page=2')
    const body = await response.json()
    expect(body).toMatchObject({ total: 2, page: 2, pageSize: 1 })
    expect(body.data.map((user: User) => user.lastName)).toEqual(['Khan'])
  })

  it('returns 200 with empty data for a page past the end', async () => {
    const body = await (await api('/api/users?page=9')).json()
    expect(body).toMatchObject({ data: [], total: 25, page: 9 })
  })

  it.each([
    ['pageSize=51', 'pageSize'],
    ['page=0', 'page'],
    ['page=abc', 'page'],
    ['role=owner', 'role'],
    ['status=banned', 'status'],
    ['sort=email', 'sort'],
    ['order=up', 'order'],
  ])('returns 400 for %s', async (query, field) => {
    const response = await api(`/api/users?${query}`)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.message).toBe('Invalid query parameters')
    expect(body.fieldErrors).toHaveProperty(field)
  })
})

describe('GET /api/users/:id', () => {
  it('returns the user', async () => {
    const response = await api(`/api/users/${anna.id}`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(anna)
  })

  it('returns 404 for an unknown id', async () => {
    const response = await api('/api/users/missing')
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ message: 'User not found' })
  })
})

describe('POST /api/users', () => {
  it('creates a normalised user with defaults', async () => {
    const response = await api('/api/users', { method: 'POST', json: validBody })
    expect(response.status).toBe(201)
    const created = await response.json()
    expect(created).toMatchObject({
      firstName: 'Zoe',
      email: 'zoe.adams@example.com',
      phone: null,
      status: 'active',
    })
    expect(created.createdAt).toBe(created.updatedAt)
    expect((await api(`/api/users/${created.id}`)).status).toBe(200)
  })

  it('returns 400 with field errors', async () => {
    const response = await api('/api/users', {
      method: 'POST',
      json: { ...validBody, firstName: '', phone: '12' },
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      message: 'Validation failed',
      fieldErrors: {
        firstName: 'First name is required',
        phone: 'Phone must be at least 7 characters',
      },
    })
  })

  it('returns 400 when the body is not JSON', async () => {
    const response = await api('/api/users', { method: 'POST', body: 'not json' })
    expect(response.status).toBe(400)
    expect((await response.json()).fieldErrors).toHaveProperty('body')
  })

  it('returns 409 when the email is taken, ignoring case', async () => {
    const response = await api('/api/users', {
      method: 'POST',
      json: { ...validBody, email: 'ANNA.kowalski@example.com' },
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      message: 'Email is already in use',
      fieldErrors: { email: 'Email is already in use' },
    })
  })
})

describe('PATCH /api/users/:id', () => {
  it('updates the user and bumps updatedAt', async () => {
    const response = await api(`/api/users/${anna.id}`, {
      method: 'PATCH',
      json: { status: 'inactive', email: anna.email },
    })
    expect(response.status).toBe(200)
    const updated = await response.json()
    expect(updated).toMatchObject({ status: 'inactive', createdAt: anna.createdAt })
    expect(updated.updatedAt > anna.updatedAt).toBe(true)
  })

  it('returns 400 for invalid fields', async () => {
    const response = await api(`/api/users/${anna.id}`, {
      method: 'PATCH',
      json: { role: 'owner' },
    })
    expect(response.status).toBe(400)
    expect((await response.json()).fieldErrors).toEqual({ role: 'Choose a role' })
  })

  it('returns 404 for an unknown id', async () => {
    const response = await api('/api/users/missing', { method: 'PATCH', json: {} })
    expect(response.status).toBe(404)
  })

  it("returns 409 for another user's email", async () => {
    const response = await api(`/api/users/${anna.id}`, {
      method: 'PATCH',
      json: { email: 'minh.nguyen@example.com' },
    })
    expect(response.status).toBe(409)
  })
})

describe('DELETE /api/users/:id', () => {
  it('returns 204 and removes the user', async () => {
    const response = await api(`/api/users/${anna.id}`, { method: 'DELETE' })
    expect(response.status).toBe(204)
    expect((await api(`/api/users/${anna.id}`)).status).toBe(404)
  })

  it('returns 404 for an unknown id', async () => {
    expect((await api('/api/users/missing', { method: 'DELETE' })).status).toBe(404)
  })
})

describe('POST /api/reset', () => {
  it('returns 204 and restores the seed data', async () => {
    await api(`/api/users/${anna.id}`, { method: 'DELETE' })
    const response = await api('/api/reset', { method: 'POST' })
    expect(response.status).toBe(204)
    expect((await (await api('/api/users')).json()).total).toBe(25)
  })
})
