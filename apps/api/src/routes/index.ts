import { Router } from 'express'
import { notFound } from '../middlewares/notFound'
import { healthRouter } from './health'

/**
 * Every router of the API. `createApp` mounts the result under `/api`. A feature ticket adds its
 * router to the list below; the 404 stays last so it only answers what nothing else matched.
 * `extraRouter` is a seam for tests (a temporary route that throws, for example).
 */
export function createApiRouter(extraRouter?: Router): Router {
  const router = Router()

  router.use(healthRouter)
  if (extraRouter) router.use(extraRouter)
  router.use(notFound)

  return router
}
