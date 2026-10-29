import { delay, http, HttpResponse } from 'msw'
import type { z } from 'zod'
import type { ApiErrorBody } from '@/features/users/api/client'
import { bulkRequestSchema, type BulkResult } from '@/features/users/bulkSchema'
import { usersExportQuerySchema, usersQuerySchema } from '@/features/users/query'
import { userCreateSchema, userUpdateSchema } from '@/features/users/schema'
import { EmailTakenError, type UserRepository } from '@/mocks/repository'

/** Fixed latency so loading states are visible (SPEC §4). */
export const MOCK_DELAY_MS = 300

interface HandlerOptions {
  delayMs?: number
}

/** The mock REST API from SPEC §4, backed by `repository`. */
export function createHandlers(
  repository: UserRepository,
  { delayMs = MOCK_DELAY_MS }: HandlerOptions = {},
) {
  async function latency() {
    if (delayMs > 0) await delay(delayMs)
  }

  return [
    http.get('/api/users', async ({ request }) => {
      await latency()
      const params = Object.fromEntries(new URL(request.url).searchParams)
      const query = usersQuerySchema.safeParse(params)
      if (!query.success) return validationError('Invalid query parameters', query.error)
      return HttpResponse.json(repository.list(query.data))
    }),

    // Registered before `/api/users/:id`, which would otherwise capture "export" as an id.
    http.get('/api/users/export', async ({ request }) => {
      await latency()
      const params = Object.fromEntries(new URL(request.url).searchParams)
      const query = usersExportQuerySchema.safeParse(params)
      if (!query.success) return validationError('Invalid query parameters', query.error)
      return HttpResponse.json(repository.listAll(query.data))
    }),

    http.get<{ id: string }>('/api/users/:id', async ({ params }) => {
      await latency()
      const user = repository.get(params.id)
      return user ? HttpResponse.json(user) : notFound()
    }),

    http.post('/api/users', async ({ request }) => {
      await latency()
      const input = userCreateSchema.safeParse(await readJson(request))
      if (!input.success) return validationError('Validation failed', input.error)
      try {
        return HttpResponse.json(repository.create(input.data), { status: 201 })
      } catch (error) {
        return conflictOr(error)
      }
    }),

    http.patch<{ id: string }>('/api/users/:id', async ({ params, request }) => {
      await latency()
      if (!repository.get(params.id)) return notFound()
      const patch = userUpdateSchema.safeParse(await readJson(request))
      if (!patch.success) return validationError('Validation failed', patch.error)
      try {
        return HttpResponse.json(repository.update(params.id, patch.data))
      } catch (error) {
        return conflictOr(error)
      }
    }),

    http.delete<{ id: string }>('/api/users/:id', async ({ params }) => {
      await latency()
      return repository.remove(params.id) ? new HttpResponse(null, { status: 204 }) : notFound()
    }),

    http.post('/api/users/bulk', async ({ request }) => {
      await latency()
      const input = bulkRequestSchema.safeParse(await readJson(request))
      if (!input.success) return validationError('Validation failed', input.error)
      const { ids } = input.data
      const done = new Set(
        input.data.action === 'delete'
          ? repository.removeMany(ids)
          : repository.updateMany(ids, { status: input.data.status }),
      )
      // The repository only skips ids that match no user, so `not_found` is the one failure
      // reason today. Give `removeMany`/`updateMany` a per-id result before adding another.
      const result: BulkResult = {
        succeeded: ids.filter((id) => done.has(id)),
        failed: ids.filter((id) => !done.has(id)).map((id) => ({ id, reason: 'not_found' })),
      }
      return HttpResponse.json(result)
    }),

    http.post('/api/reset', async () => {
      await latency()
      repository.reset()
      return new HttpResponse(null, { status: 204 })
    }),
  ]
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

function errorResponse(status: number, body: ApiErrorBody) {
  return HttpResponse.json(body, { status })
}

function notFound() {
  return errorResponse(404, { message: 'User not found' })
}

/** 400 with the first message per field, keyed by the top-level field name. */
function validationError(message: string, error: z.ZodError) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? String(issue.path[0]) : 'body'
    fieldErrors[field] ??= issue.message
  }
  return errorResponse(400, { message, fieldErrors })
}

function conflictOr(error: unknown) {
  if (!(error instanceof EmailTakenError)) throw error
  return errorResponse(409, { message: error.message, fieldErrors: { email: error.message } })
}
