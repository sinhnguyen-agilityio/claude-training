import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { z } from 'zod'
import { usersQuerySchema, type SortOrder, type UsersSortField } from '@/features/users/query'
import type { UserRole, UserStatus } from '@/features/users/schema'

const { role, status, sort, order, page } = usersQuerySchema.shape

/** Parses one URL param with its schema; a missing or invalid value falls back to the default. */
function read<S extends z.ZodType>(schema: S, raw: string | null): z.output<S> {
  const parsed = schema.safeParse(raw ?? undefined)
  return parsed.success ? parsed.data : schema.parse(undefined)
}

export interface UsersListState {
  /** Raw search text, exactly as typed (the API trims it). */
  q: string
  role: UserRole | undefined
  status: UserStatus | undefined
  sort: UsersSortField
  order: SortOrder
  page: number
}

const DEFAULTS = { sort: 'createdAt', order: 'desc', page: '1' } as const

/**
 * The list view's state, kept in the URL so reloading or sharing the link restores it (SPEC F1).
 * Default values are left out of the URL. Changing search, a filter or the sort resets the page.
 */
export function useUsersListParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const state: UsersListState = useMemo(
    () => ({
      q: searchParams.get('q') ?? '',
      role: read(role, searchParams.get('role')),
      status: read(status, searchParams.get('status')),
      sort: read(sort, searchParams.get('sort')),
      order: read(order, searchParams.get('order')),
      page: read(page, searchParams.get('page')),
    }),
    [searchParams],
  )

  const update = useCallback(
    (
      changes: Partial<Record<keyof UsersListState, string | number | undefined>>,
      options: { replace?: boolean } = {},
    ) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (!('page' in changes)) next.delete('page')
          for (const [key, value] of Object.entries(changes)) {
            const text = value === undefined ? '' : String(value)
            if (text === '' || DEFAULTS[key as keyof typeof DEFAULTS] === text) next.delete(key)
            else next.set(key, text)
          }
          return next
        },
        { replace: options.replace },
      )
    },
    [setSearchParams],
  )

  const actions = useMemo(
    () => ({
      setPage: (nextPage: number, options?: { replace?: boolean }) =>
        update({ page: nextPage }, options),
      // Replace while typing, so Back does not step through every keystroke.
      setSearch: (q: string) => update({ q }, { replace: true }),
      setRole: (value: UserRole | undefined) => update({ role: value }),
      setStatus: (value: UserStatus | undefined) => update({ status: value }),
      setSort: (nextSort: UsersSortField, nextOrder: SortOrder) =>
        update({ sort: nextSort, order: nextOrder }),
      /** Clears search and filters; keeps the sort. */
      clearFilters: () => update({ q: undefined, role: undefined, status: undefined }),
    }),
    [update],
  )

  const hasFilters = state.q.trim() !== '' || state.role !== undefined || state.status !== undefined

  return { state, hasFilters, ...actions }
}
