import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError, isApiError, usersApi } from '@/features/users/api/client'
import { server } from '@/mocks/node'
import { seedUsers } from '@/mocks/seed'

const anna = seedUsers[0]!

async function caught(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the request to fail')
}

describe('usersApi', () => {
  it('lists users, sending only the defined query params', async () => {
    let url = ''
    server.events.on('request:start', ({ request }) => {
      url = request.url
    })

    const page = await usersApi.list({ q: 'nguyen', role: undefined, page: 1 })

    expect(page.total).toBe(2)
    expect(new URL(url).search).toBe('?q=nguyen&page=1')
    server.events.removeAllListeners()
  })

  it('lists with no query', async () => {
    expect((await usersApi.list()).data).toHaveLength(10)
  })

  it('gets, creates, updates and deletes a user', async () => {
    expect(await usersApi.get(anna.id)).toEqual(anna)

    const created = await usersApi.create({
      firstName: 'Zoe',
      lastName: 'Adams',
      email: 'zoe@example.com',
      role: 'viewer',
    })
    expect(created.status).toBe('active')

    const updated = await usersApi.update(created.id, { role: 'admin' })
    expect(updated.role).toBe('admin')

    await expect(usersApi.remove(created.id)).resolves.toBeUndefined()
    await expect(usersApi.get(created.id)).rejects.toThrow('User not found')
  })

  it('resets the data', async () => {
    await usersApi.remove(anna.id)
    await usersApi.reset()
    expect(await usersApi.get(anna.id)).toEqual(anna)
  })

  it('throws ApiError with status and field errors', async () => {
    const error = await caught(
      usersApi.create({ firstName: 'A', lastName: 'B', email: anna.email, role: 'viewer' }),
    )
    expect(isApiError(error, 409)).toBe(true)
    expect(error).toMatchObject({
      status: 409,
      message: 'Email is already in use',
      fieldErrors: { email: 'Email is already in use' },
    })
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    server.use(http.get('/api/users/:id', () => new HttpResponse('oops', { status: 500 })))

    const error = await caught(usersApi.get(anna.id))
    expect(error).toMatchObject({
      status: 500,
      message: 'Request failed with status 500',
      fieldErrors: {},
    })
  })

  it('reports network failures as status 0', async () => {
    server.use(http.get('/api/users', () => HttpResponse.error()))

    const error = await caught(usersApi.list())
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 0 })
  })
})

describe('isApiError', () => {
  it('checks the type and, optionally, the status', () => {
    const notFound = new ApiError(404, 'User not found')
    expect(isApiError(notFound)).toBe(true)
    expect(isApiError(notFound, 404)).toBe(true)
    expect(isApiError(notFound, 500)).toBe(false)
    expect(isApiError(new Error('x'))).toBe(false)
  })
})
