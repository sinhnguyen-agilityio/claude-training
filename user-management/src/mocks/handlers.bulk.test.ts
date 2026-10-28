import { describe, expect, it } from 'vitest'
import type { User } from '@/features/users/schema'
import { seedUsers } from '@/mocks/seed'

function api(path: string, init?: RequestInit & { json?: unknown }) {
  const { json, ...rest } = init ?? {}
  return fetch(new URL(path, location.origin), {
    ...rest,
    headers: json === undefined ? rest.headers : { 'Content-Type': 'application/json' },
    body: json === undefined ? rest.body : JSON.stringify(json),
  })
}

const [first, second, third] = seedUsers.slice(0, 3).map((user) => user.id) as [
  string,
  string,
  string,
]
const bulk = (json: unknown) => api('/api/users/bulk', { method: 'POST', json })

describe('POST /api/users/bulk', () => {
  it('deletes the users and reports each id once', async () => {
    const response = await bulk({ action: 'delete', ids: [first, second] })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ succeeded: [first, second], failed: [] })
    expect((await api(`/api/users/${first}`)).status).toBe(404)
    expect((await api(`/api/users/${third}`)).status).toBe(200)
  })

  it('sets the status and a new updatedAt, even for a user who already has it', async () => {
    const before = (await (await api(`/api/users/${first}`)).json()) as User

    const response = await bulk({
      action: 'setStatus',
      ids: [first, second],
      status: before.status,
    })
    expect((await response.json()).succeeded).toEqual([first, second])

    const after = (await (await api(`/api/users/${first}`)).json()) as User
    expect(after.status).toBe(before.status)
    expect(after.updatedAt > before.updatedAt).toBe(true)
  })

  it('removes duplicate ids and reports an unknown id as not_found with a 200', async () => {
    const response = await bulk({ action: 'delete', ids: [first, first, 'missing', 'missing'] })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      succeeded: [first],
      failed: [{ id: 'missing', reason: 'not_found' }],
    })
  })

  it('counts the 50 id limit after removing duplicates', async () => {
    const ids = Array.from({ length: 50 }, (_, index) => `missing-${index}`)
    expect((await bulk({ action: 'delete', ids: [...ids, ...ids] })).status).toBe(200)
    expect((await bulk({ action: 'delete', ids: [...ids, 'one-more'] })).status).toBe(400)
  })

  it('caps the entries before removing duplicates, so a body cannot be inflated', async () => {
    expect((await bulk({ action: 'delete', ids: Array(500).fill('same') })).status).toBe(200)
    const response = await bulk({ action: 'delete', ids: Array(501).fill('same') })
    expect(response.status).toBe(400)
    expect((await response.json()).fieldErrors).toHaveProperty('ids')
  })

  it.each([
    ['empty ids', { action: 'delete', ids: [] }, 'ids'],
    ['missing ids', { action: 'delete' }, 'ids'],
    ['an empty id', { action: 'delete', ids: [''] }, 'ids'],
    ['a non-string id', { action: 'delete', ids: [1] }, 'ids'],
    ['an unknown action', { action: 'archive', ids: ['a'] }, 'action'],
    ['no status on setStatus', { action: 'setStatus', ids: ['a'] }, 'status'],
    ['an invalid status', { action: 'setStatus', ids: ['a'], status: 'banned' }, 'status'],
  ])('returns 400 for %s', async (_name, body, field) => {
    const response = await bulk(body)
    expect(response.status).toBe(400)
    const error = await response.json()
    expect(error.message).toBe('Validation failed')
    expect(error.fieldErrors).toHaveProperty(field)
  })

  it('returns 400 for a body that is not JSON', async () => {
    const response = await api('/api/users/bulk', { method: 'POST', body: 'nope' })
    expect(response.status).toBe(400)
  })
})
