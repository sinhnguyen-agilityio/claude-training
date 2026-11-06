import type { User, UsersPage, UsersQuery } from '@app/shared'
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { toUser } from '../db/mappers'
import { users } from '../db/schema'
import type { Database } from '../db/types'
import { escapeLike } from '../utils/escapeLike'
import { isUuid } from '../utils/isUuid'

/**
 * One user for `GET /api/users/:id`, or `null` when there is none. An id that is not a UUID has no
 * user either: it is answered without a query, because the `uuid` column would raise an error for it
 * (a 500) and the API treats it like any other unknown id (a 404).
 */
export async function getUser(db: Database, id: string): Promise<User | null> {
  if (!isUuid(id)) return null

  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return row ? toUser(row) : null
}

/**
 * One page of users for `GET /api/users` (SPEC §4). `q` matches the first name, the last name or the
 * email, each on its own and without regard to case; `role` and `status` narrow the result (AND).
 */
export async function listUsers(db: Database, query: UsersQuery): Promise<UsersPage> {
  const { q, role, status, sort, order, page, pageSize } = query

  const pattern = q ? `%${escapeLike(q)}%` : undefined
  const where = and(
    role ? eq(users.role, role) : undefined,
    status ? eq(users.status, status) : undefined,
    pattern
      ? or(
          ilike(users.firstName, pattern),
          ilike(users.lastName, pattern),
          ilike(users.email, pattern),
        )
      : undefined,
  )

  const [counted] = await db.select({ value: count() }).from(users).where(where)
  const total = counted?.value ?? 0

  // A page past the end is a normal answer (SPEC §4), and needs no second query.
  const offset = (page - 1) * pageSize
  if (offset >= total) return { data: [], total, page, pageSize }

  // Names are compared with lower(), so letter case does not change the order (A1). Punctuation and
  // accents (O'Brien, Éva) still follow the collation of the database. The id makes the order total,
  // so paging never repeats or skips a user (A2).
  const direction = order === 'asc' ? asc : desc
  const orderBy =
    sort === 'name'
      ? [
          direction(sql`lower(${users.lastName})`),
          direction(sql`lower(${users.firstName})`),
          direction(users.id),
        ]
      : [direction(users.createdAt), direction(users.id)]

  const rows = await db
    .select()
    .from(users)
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset(offset)

  return { data: rows.map(toUser), total, page, pageSize }
}
