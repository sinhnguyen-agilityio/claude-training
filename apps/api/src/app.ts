import express, { type Router } from 'express'
import type { Database } from './db/types'
import { errorHandler } from './middlewares/errorHandler'
import { requestLogger } from './middlewares/requestLogger'
import { createApiRouter } from './routes'
import { silentLogger, type Logger } from './utils/logger'

export interface CreateAppOptions {
  /** Where log lines go. Silent by default, so tests stay quiet; `server.ts` passes the real one. */
  logger?: Logger
  /**
   * The database behind the routes that store data (`/api/users`). `server.ts` always passes it; a
   * test of an unrelated route can leave it out and needs no Postgres.
   */
  db?: Database
  /** Mounted under /api before the 404. For tests that need a route the API does not have. */
  extraRouter?: Router
}

export function createApp(options: CreateAppOptions = {}) {
  const logger = options.logger ?? silentLogger
  const app = express()

  app.use(requestLogger(logger))
  app.use(express.json())
  app.use('/api', createApiRouter({ db: options.db, extraRouter: options.extraRouter }))
  app.use(errorHandler(logger))

  return app
}
