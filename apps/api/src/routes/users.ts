import {
  bulkRequestSchema,
  userCreateSchema,
  usersExportQuerySchema,
  usersQuerySchema,
  userUpdateSchema,
} from '@app/shared'
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
  router.post('/', validate({ body: userCreateSchema }), controller.create)
  router.post('/bulk', validate({ body: bulkRequestSchema }), controller.bulk)
  // A fixed path below /users must be registered above the `/:id` route of the same method, or its
  // name would be taken for an id: GET /export (#45) above the next line, and any later PATCH or
  // DELETE fixed path above those routes. POST /bulk (#44) cannot clash: there is no POST /:id.
  router.get('/export', validate({ query: usersExportQuerySchema }), controller.exportList)
  // No validate() on GET: a bad id is a 404, not a 400 (SPEC §4).
  router.get('/:id', controller.get)
  // The body is validated before the user is looked up, so an invalid body for an unknown id is a 400.
  router.patch('/:id', validate({ body: userUpdateSchema }), controller.update)
  // No validate() on DELETE either: a bad id is a 404 (SPEC §4).
  router.delete('/:id', controller.remove)
  router.use(brokenEscapeIsUnknownId)

  return router
}
