import type { UsersQuery } from '@app/shared'
import type { RequestHandler } from 'express'
import type { Database } from '../db/types'
import { listUsers } from '../services/users'
import { asyncHandler } from '../utils/asyncHandler'

/** The handlers of /api/users. They get the database from `createApp({ db })`, so tests can pass their own. */
export function createUsersController(db: Database) {
  const list: RequestHandler = asyncHandler(async (req, res) => {
    // validate() has parsed the query with usersQuerySchema; Express 5 leaves req.query read-only.
    const query = req.validated?.query as UsersQuery
    res.json(await listUsers(db, query))
  })

  return { list }
}
