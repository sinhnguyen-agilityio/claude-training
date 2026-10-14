import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { usersQuerySchema, type UsersQuery } from '@/features/users/query'

/** Reads one param, falling back to its default when it is missing or invalid. */
function readPage(params: URLSearchParams): UsersQuery['page'] {
  const parsed = usersQuerySchema.shape.page.safeParse(params.get('page') ?? undefined)
  return parsed.success ? parsed.data : 1
}

/** The list view's state, kept in the URL so reloading or sharing the link restores it (SPEC F1). */
export function useUsersListParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPage(searchParams)

  const query = useMemo(() => ({ page }), [page])

  const setPage = useCallback(
    (nextPage: number, options: { replace?: boolean } = {}) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (nextPage <= 1) next.delete('page')
          else next.set('page', String(nextPage))
          return next
        },
        { replace: options.replace },
      )
    },
    [setSearchParams],
  )

  return { query, setPage }
}
