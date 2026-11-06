import { Router } from 'express'
import type { AddressInfo } from 'node:net'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from './app'
import type { Logger } from './utils/logger'

function recordingLogger() {
  const lines: string[] = []
  const errors: unknown[] = []
  const logger: Logger = {
    info: (message) => {
      lines.push(message)
    },
    error: (message, error) => {
      lines.push(message)
      errors.push(error)
    },
  }
  return { logger, lines, errors }
}

describe('GET /api/health', () => {
  it('answers 200 { status: "ok" } without opening a port', async () => {
    const res = await request(createApp()).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('error handling', () => {
  it('answers 404 { message: "Not found" } for an unknown route under /api', async () => {
    const res = await request(createApp()).get('/api/nope')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Not found' })
  })

  it('answers 400 { message: "Invalid JSON" } when the body is not valid JSON', async () => {
    const res = await request(createApp())
      .post('/api/anything')
      .set('Content-Type', 'application/json')
      .send('{"name":')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Invalid JSON' })
  })

  it('answers 413 with a JSON body, not 500, when the JSON body is too large', async () => {
    const { logger, errors } = recordingLogger()

    const res = await request(createApp({ logger }))
      .post('/api/anything')
      .send({ text: 'x'.repeat(200_000) })

    expect(res.status).toBe(413)
    expect(res.body).toEqual({ message: 'Payload too large' })
    expect(errors).toEqual([])
  })

  it('answers 500 without a stack trace and logs the error on the server', async () => {
    const boom = new Error('relation "users" does not exist')
    const extraRouter = Router()
    extraRouter.get('/boom', () => {
      throw boom
    })
    const { logger, errors } = recordingLogger()

    const res = await request(createApp({ logger, extraRouter })).get('/api/boom')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })
    expect(JSON.stringify(res.body)).not.toContain('users')
    expect(errors).toEqual([boom])
  })

  it('answers 500 for an error thrown by an async route', async () => {
    const extraRouter = Router()
    extraRouter.get('/later', async () => {
      await Promise.resolve()
      throw new Error('late failure')
    })

    const res = await request(createApp({ extraRouter })).get('/api/later')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })
  })
})

describe('request log', () => {
  it('writes one line per request with method, path, status and duration', async () => {
    const { logger, lines } = recordingLogger()

    await request(createApp({ logger })).get('/api/health')

    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^GET \/api\/health 200 \d+ms$/)
  })

  it('logs the status of an error response', async () => {
    const { logger, lines } = recordingLogger()

    await request(createApp({ logger })).get('/api/nope')

    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^GET \/api\/nope 404 \d+ms$/)
  })

  it('still writes the line when the client hangs up before the response is sent', async () => {
    let requestArrived: () => void = () => {}
    const arrived = new Promise<void>((resolve) => {
      requestArrived = resolve
    })
    const extraRouter = Router()
    extraRouter.get('/slow', () => {
      // Never answers: the client closes the connection first.
      requestArrived()
    })
    const { logger, lines } = recordingLogger()
    const server = createApp({ logger, extraRouter }).listen(0)

    try {
      const controller = new AbortController()
      const { port } = server.address() as AddressInfo
      const pending = fetch(`http://127.0.0.1:${port}/api/slow`, {
        signal: controller.signal,
      }).catch(() => undefined)
      await arrived
      controller.abort()
      await pending
      await vi.waitFor(() => expect(lines).toHaveLength(1))
    } finally {
      server.close()
    }

    expect(lines[0]).toMatch(/^GET \/api\/slow \d{3} \d+ms$/)
  })

  it('never logs the query values or the body', async () => {
    const { logger, lines } = recordingLogger()

    await request(createApp({ logger }))
      .post('/api/nope?q=secret-term')
      .send({ email: 'private@example.com' })

    const all = lines.join('\n')
    expect(all).toContain('POST /api/nope 404')
    expect(all).not.toContain('secret-term')
    expect(all).not.toContain('private@example.com')
  })
})
