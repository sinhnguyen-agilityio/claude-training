import { z } from 'zod'
import { USER_STATUSES } from '@/features/users/schema'

/** Most ids one bulk request may carry, counted after duplicates are removed (SPEC F7). */
export const MAX_BULK_IDS = 50

/**
 * Ids are plain non-empty strings, not UUIDs: a well-formed id that matches no user is reported
 * as `not_found` in the response, not rejected with a 400.
 */
const idsSchema = z
  .array(z.string({ error: 'Each id must be a string' }).min(1, 'Each id must not be empty'), {
    error: 'ids must be an array',
  })
  .transform((ids) => [...new Set(ids)])
  .pipe(
    z
      .array(z.string())
      .min(1, 'Select at least one user')
      .max(MAX_BULK_IDS, `At most ${MAX_BULK_IDS} users per request`),
  )

/** Body of `POST /api/users/bulk`. Shared by the UI and the mock API. */
export const bulkRequestSchema = z.discriminatedUnion(
  'action',
  [
    z.object({ action: z.literal('delete'), ids: idsSchema }),
    z.object({
      action: z.literal('setStatus'),
      ids: idsSchema,
      status: z.enum(USER_STATUSES, { error: 'Choose a status' }),
    }),
  ],
  { error: 'Unknown action' },
)

export type BulkRequest = z.output<typeof bulkRequestSchema>

export interface BulkFailure {
  id: string
  reason: string
}

/** Response of `POST /api/users/bulk`: a partial failure is still a 200. */
export interface BulkResult {
  succeeded: string[]
  failed: BulkFailure[]
}
