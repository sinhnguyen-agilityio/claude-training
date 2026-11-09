import type { UserCreate, UsersQuery } from '@app/shared'
import type { RequestHandler } from 'express'
import { HTTP_STATUS } from '../constants/http'
import { EMAIL_IN_USE, USER_NOT_FOUND } from '../constants/messages'
import type { Database } from '../db/types'
import { createUser, EmailTakenError, getUser, listUsers } from '../services/users'
import { asyncHandler } from '../utils/asyncHandler'

/** The handlers of /api/users. They get the database from `createApp({ db })`, so tests can pass their own. */
export function createUsersController(db: Database) {
  const list: RequestHandler = asyncHandler(async (req, res) => {
    // validate() has parsed the query with usersQuerySchema; Express 5 leaves req.query read-only.
    const query = req.validated?.query as UsersQuery
    res.json(await listUsers(db, query))
  })

  const get: RequestHandler = asyncHandler(async (req, res) => {
    const user = await getUser(db, String(req.params.id))
    if (!user) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: USER_NOT_FOUND })
      return
    }
    res.json(user)
  })

  const create: RequestHandler = asyncHandler(async (req, res) => {
    // validate() has parsed the body with userCreateSchema: unknown keys (id, createdAt) are dropped.
    const input = req.validated?.body as UserCreate
    try {
      const user = await createUser(db, input)
      res.status(HTTP_STATUS.CREATED).json(user)
    } catch (error) {
      if (!(error instanceof EmailTakenError)) throw error
      res
        .status(HTTP_STATUS.CONFLICT)
        .json({ message: EMAIL_IN_USE, fieldErrors: { email: EMAIL_IN_USE } })
    }
  })

  return { list, get, create }
}
