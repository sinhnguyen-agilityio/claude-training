import { Router } from 'express'
import { createResetController } from '../controllers/reset'
import type { Database } from '../db/types'

/** `POST /api/reset` (SPEC §4). Registered only when `allowReset` is on, see `createApiRouter`. */
export function createResetRouter(db: Database): Router {
  const router = Router()

  router.post('/reset', createResetController(db).reset)

  return router
}
