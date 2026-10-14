import { z } from 'zod'
import { USER_ROLES, USER_STATUSES, type User } from '@/features/users/schema'

/** Query parameters of `GET /api/users` (SPEC §4), shared by the mock API and the list URL. */

export const USERS_SORT_FIELDS = ['name', 'createdAt'] as const
export const SORT_ORDERS = ['asc', 'desc'] as const
export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 50

export const usersQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  sort: z.enum(USERS_SORT_FIELDS).default('createdAt'),
  order: z.enum(SORT_ORDERS).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type UsersQuery = z.output<typeof usersQuerySchema>
export type UsersQueryInput = z.input<typeof usersQuerySchema>
export type UsersSortField = (typeof USERS_SORT_FIELDS)[number]
export type SortOrder = (typeof SORT_ORDERS)[number]

/** Response body of `GET /api/users`. */
export interface UsersPage {
  data: User[]
  total: number
  page: number
  pageSize: number
}
