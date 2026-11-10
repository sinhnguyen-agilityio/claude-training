import type { RequestHandler } from 'express'
import { HTTP_STATUS } from '../constants/http'
import type { Database } from '../db/types'
import { resetUsers } from '../services/reset'
import { asyncHandler } from '../utils/asyncHandler'

/** The handler of POST /api/reset (SPEC §4). Any request body is ignored; no auth (#43, A5). */
export function createResetController(db: Database) {
  const reset: RequestHandler = asyncHandler(async (_req, res) => {
    await resetUsers(db)
    res.status(HTTP_STATUS.NO_CONTENT).end()
  })

  return { reset }
}
