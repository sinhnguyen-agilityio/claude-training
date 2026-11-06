import { usersQuerySchema } from '@app/shared'
import { Router, type ErrorRequestHandler } from 'express'
import { HTTP_STATUS } from '../constants/http'
import { USER_NOT_FOUND } from '../constants/messages'
import { createUsersController } from '../controllers/users'
import type { Database } from '../db/types'
import { validate } from '../middlewares/validate'

/**
 * Express decodes the id itself and throws a URIError (status 400) when it holds a broken escape
 * such as `%zz`, before the controller runs. The id cannot be one of ours, so it is an unknown id
 * like any other (SPEC §4). Every other error goes on to the error handler of the app.
 */
const brokenEscapeIsUnknownId: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof URIError) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: USER_NOT_FOUND })
    return
  }
  next(error)
}

export function createUsersRouter(db: Database): Router {
  const router = Router()
  const controller = createUsersController(db)

  router.get('/', validate({ query: usersQuerySchema }), controller.list)
  // Every fixed path below /users (GET /export, #45) must be registered above this line: after it,
  // `export` would be taken for an id. No validate() here: a bad id is a 404, not a 400 (SPEC §4).
  router.get('/:id', controller.get)
  router.use(brokenEscapeIsUnknownId)

  return router
}
