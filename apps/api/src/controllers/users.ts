import type { BulkRequestParsed, UserCreate, UsersQuery, UserUpdate } from '@app/shared'
import type { RequestHandler, Response } from 'express'
import { HTTP_STATUS } from '../constants/http'
import { EMAIL_IN_USE, NOTHING_TO_UPDATE, USER_NOT_FOUND } from '../constants/messages'
import type { Database } from '../db/types'
import {
  bulkUsers,
  createUser,
  deleteUser,
  EmailTakenError,
  getUser,
  listUsers,
  updateUser,
} from '../services/users'
import { asyncHandler } from '../utils/asyncHandler'

/** The 409 of POST and PATCH: the same body, so the form maps it to the email input (SPEC §4). */
function sendEmailInUse(res: Response): void {
  res
    .status(HTTP_STATUS.CONFLICT)
    .json({ message: EMAIL_IN_USE, fieldErrors: { email: EMAIL_IN_USE } })
}

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
      sendEmailInUse(res)
    }
  })

  const update: RequestHandler = asyncHandler(async (req, res) => {
    // validate() has parsed the body with userUpdateSchema: unknown keys (id, createdAt) are dropped,
    // so a body that held only those is empty here, like `{}` (A2).
    const input = req.validated?.body as UserUpdate
    if (Object.keys(input).length === 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ message: NOTHING_TO_UPDATE })
      return
    }

    try {
      const user = await updateUser(db, String(req.params.id), input)
      if (!user) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ message: USER_NOT_FOUND })
        return
      }
      res.json(user)
    } catch (error) {
      if (!(error instanceof EmailTakenError)) throw error
      sendEmailInUse(res)
    }
  })

  const remove: RequestHandler = asyncHandler(async (req, res) => {
    const deleted = await deleteUser(db, String(req.params.id))
    if (!deleted) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: USER_NOT_FOUND })
      return
    }
    res.status(HTTP_STATUS.NO_CONTENT).end()
  })

  const bulk: RequestHandler = asyncHandler(async (req, res) => {
    // validate() has parsed the body with bulkRequestSchema: the ids are distinct, 1 to 50.
    const input = req.validated?.body as BulkRequestParsed
    res.json(await bulkUsers(db, input))
  })

  return { list, get, create, update, remove, bulk }
}
