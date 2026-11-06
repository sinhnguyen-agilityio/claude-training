import { Router } from 'express'
import type { Database } from '../db/types'
import { notFound } from '../middlewares/notFound'
import { healthRouter } from './health'
import { createUsersRouter } from './users'

export interface ApiRouterOptions {
  /** The database for the routes that store data. Without it only the routes that need none exist. */
  db?: Database
  /** For tests that need a route the API does not have (one that throws, for example). */
  extraRouter?: Router
}

/**
 * Every router of the API. `createApp` mounts the result under `/api`. A feature ticket adds its
 * router to the list below; the 404 stays last so it only answers what nothing else matched.
 */
export function createApiRouter({ db, extraRouter }: ApiRouterOptions = {}): Router {
  const router = Router()

  router.use(healthRouter)
  if (db) router.use('/users', createUsersRouter(db))
  if (extraRouter) router.use(extraRouter)
  router.use(notFound)

  return router
}
