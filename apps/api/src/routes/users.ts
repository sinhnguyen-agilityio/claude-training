import { usersQuerySchema } from '@app/shared'
import { Router } from 'express'
import { createUsersController } from '../controllers/users'
import type { Database } from '../db/types'
import { validate } from '../middlewares/validate'

export function createUsersRouter(db: Database): Router {
  const router = Router()
  const controller = createUsersController(db)

  router.get('/', validate({ query: usersQuerySchema }), controller.list)

  return router
}
