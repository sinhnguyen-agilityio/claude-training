import { describe, expect, it } from 'vitest'
import type { User } from '@/features/users/schema'

function api(path: string) {
  return fetch(new URL(path, location.origin))
}

describe('GET /api/users/export', () => {
  it('returns every matching user, not a page', async () => {
    const response = await api('/api/users/export')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.total).toBe(25)
    expect(body.data).toHaveLength(25)
    expect(body).not.toHaveProperty('page')
  })

  it('is not captured by GET /api/users/:id, which would answer 404 "User not found"', async () => {
    // Guards the registration order in `createHandlers`: `/api/users/:id` must come after it.
    const response = await api('/api/users/export')
    expect(response.status).not.toBe(404)
    const detail = await api('/api/users/export-is-not-an-id')
    expect(detail.status).toBe(404)
  })

  it('applies search, filters, sort and order, and ignores paging', async () => {
    const response = await api(
      '/api/users/export?q=an&role=editor&sort=name&order=asc&page=9&pageSize=1',
    )
    const body = await response.json()
    expect(body.total).toBe(2)
    expect(body.data.map((user: User) => user.lastName)).toEqual(['Baker', 'Khan'])
  })

  it('sorts in the requested order', async () => {
    const asc = await (await api('/api/users/export?sort=createdAt&order=asc')).json()
    const dates = asc.data.map((user: User) => user.createdAt)
    expect(dates).toEqual([...dates].sort())
  })

  it.each([
    ['role=boss', 'role'],
    ['status=gone', 'status'],
    ['sort=email', 'sort'],
    ['order=up', 'order'],
  ])('returns 400 with the list error body for an invalid query (%s)', async (query, field) => {
    const response = await api(`/api/users/export?${query}`)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.message).toBe('Invalid query parameters')
    expect(body.fieldErrors).toHaveProperty(field)
  })
})
