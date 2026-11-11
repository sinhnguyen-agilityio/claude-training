import { Router } from 'express'
import { createGetHealth } from '../controllers/health'
import type { Database } from '../db/types'

export function createHealthRouter(db?: Database): Router {
  const router = Router()
  router.get('/health', createGetHealth(db))
  return router
}
