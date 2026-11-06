import type { User } from '@app/shared'
import type { UserRow } from './schema'

/** A database row as the API returns it: dates become ISO 8601 strings (SPEC §3). */
export function toUser(row: UserRow): User {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
