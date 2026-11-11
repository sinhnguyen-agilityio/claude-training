import { Router } from 'express'
import type { Database } from '../db/types'
import { notFound } from '../middlewares/notFound'
import { createHealthRouter } from './health'
import { createResetRouter } from './reset'
import { createUsersRouter } from './users'

export interface ApiRouterOptions {
  /** The database for the routes that store data. Without it only the routes that need none exist. */
  db?: Database
  /**
   * Turns on `POST /api/reset` (#43). Off by default: the route is then not registered and the 404
   * answers, because a reset wipes shared data.
   */
  allowReset?: boolean
  /** For tests that need a route the API does not have (one that throws, for example). */
  extraRouter?: Router
}

/**
 * Every router of the API. `createApp` mounts the result under `/api`. A feature ticket adds its
 * router to the list below; the 404 stays last so it only answers what nothing else matched.
 */
export function createApiRouter({ db, allowReset, extraRouter }: ApiRouterOptions = {}): Router {
  const router = Router()

  router.use(createHealthRouter(db))
  if (db) router.use('/users', createUsersRouter(db))
  if (db && allowReset) router.use(createResetRouter(db))
  if (extraRouter) router.use(extraRouter)
  router.use(notFound)

  return router
}
