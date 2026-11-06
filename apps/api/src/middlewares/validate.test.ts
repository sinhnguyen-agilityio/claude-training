import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { errorHandler } from './errorHandler'
import { validate } from './validate'

const silent = { info: () => {}, error: () => {} }

function appWith(schemas: Parameters<typeof validate>[0]) {
  const app = express()
  app.use(express.json())
  app.post('/items/:id', validate(schemas), (req, res) => {
    res.json(req.validated)
  })
  app.use(errorHandler(silent))
  return app
}

describe('validate', () => {
  it('puts the parsed body, query and params on req.validated', async () => {
    const app = appWith({
      body: z.object({ name: z.string().trim() }),
      query: z.object({ page: z.coerce.number().default(1) }),
      params: z.object({ id: z.string() }),
    })

    const res = await request(app).post('/items/42?page=3').send({ name: '  Ada  ' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ body: { name: 'Ada' }, query: { page: 3 }, params: { id: '42' } })
  })

  it('answers 400 with the first message per field', async () => {
    const app = appWith({
      body: z.object({
        name: z
          .string()
          .min(2, 'Too short')
          .regex(/^[A-Z]/, 'Capital first'),
        age: z.number(),
      }),
    })

    const res = await request(app).post('/items/1').send({ name: 'a', age: 'x' })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Validation failed')
    expect(res.body.fieldErrors.name).toBe('Too short')
    expect(typeof res.body.fieldErrors.age).toBe('string')
    expect(Object.keys(res.body.fieldErrors).sort()).toEqual(['age', 'name'])
  })

  it('reports each missing field when the request has no body at all', async () => {
    const app = appWith({ body: z.object({ name: z.string(), email: z.string() }) })

    const res = await request(app).post('/items/1')

    expect(res.status).toBe(400)
    expect(Object.keys(res.body.fieldErrors).sort()).toEqual(['email', 'name'])
  })

  it('validates the query and the params too', async () => {
    const app = appWith({
      query: z.object({ page: z.coerce.number().int().min(1) }),
      params: z.object({ id: z.string().uuid('Invalid id') }),
    })

    const res = await request(app).post('/items/not-a-uuid?page=0').send({})

    expect(res.status).toBe(400)
    expect(res.body.fieldErrors).toHaveProperty('page')
    expect(res.body.fieldErrors.id).toBe('Invalid id')
  })

  it('joins a nested path with dots and uses "_" when there is no path', async () => {
    const app = appWith({
      body: z
        .object({
          user: z.object({ email: z.string().email('Bad email') }),
          a: z.number(),
          b: z.number(),
        })
        .refine((value) => value.a < value.b, 'a must be below b'),
    })

    const nested = await request(app)
      .post('/items/1')
      .send({ user: { email: 'x' }, a: 1, b: 2 })
    expect(nested.body.fieldErrors['user.email']).toBe('Bad email')

    const whole = await request(app)
      .post('/items/1')
      .send({ user: { email: 'a@b.co' }, a: 2, b: 1 })
    expect(whole.body.fieldErrors._).toBe('a must be below b')
  })
})
