import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { errorHandler } from '../middlewares/errorHandler'
import { asyncHandler } from './asyncHandler'

const silent = { info: () => {}, error: () => {} }

function appWith(handler: ReturnType<typeof asyncHandler>) {
  const app = express()
  app.get('/boom', handler)
  app.use(errorHandler(silent))
  return app
}

describe('asyncHandler', () => {
  it('forwards an error thrown in an async controller to the error middleware', async () => {
    const app = appWith(
      asyncHandler(async () => {
        await Promise.resolve()
        throw new Error('database exploded')
      }),
    )

    const res = await request(app).get('/boom')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })
  })

  it('lets a controller that resolves answer normally', async () => {
    const app = appWith(
      asyncHandler(async (_req, res) => {
        await Promise.resolve()
        res.json({ ok: true })
      }),
    )

    const res = await request(app).get('/boom')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})
