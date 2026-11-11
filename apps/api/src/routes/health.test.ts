import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../app'
import type { Database } from '../db/types'

/** Only `execute` is used by the health check, so a stub stands in for the whole database. */
function appWith(execute: () => Promise<unknown>) {
  return createApp({ db: { execute } as unknown as Database })
}

describe('GET /api/health with a database', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('answers 200 { status: "ok" } when select 1 succeeds', async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] })

    const res = await request(appWith(execute)).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('answers 503 { message: "Database unavailable" } when the query fails', async () => {
    const res = await request(appWith(() => Promise.reject(new Error('ECONNREFUSED')))).get(
      '/api/health',
    )

    expect(res.status).toBe(503)
    expect(res.body).toEqual({ message: 'Database unavailable' })
  })

  it('answers 503 when the query takes longer than 5 seconds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const hang = vi.fn(() => new Promise<never>(() => {}))

    const pending = request(appWith(hang))
      .get('/api/health')
      .then((res) => res)
    // The handler has started its 5-second timer once it has called the database.
    await vi.waitFor(() => expect(hang).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(5000)
    const res = await pending

    expect(res.status).toBe(503)
    expect(res.body).toEqual({ message: 'Database unavailable' })
  })
})
