import { useEffect, useMemo } from 'react'
import { useUsers } from '@/features/users/api/hooks'
import { Pagination } from '@/features/users/components/Pagination'
import { UsersTable } from '@/features/users/components/UsersTable'
import { UsersToolbar } from '@/features/users/components/UsersToolbar'
import { useUsersListParams } from '@/features/users/hooks/useUsersListParams'
import { lastPageOf, type UsersQueryInput } from '@/features/users/query'
import { TableSkeleton } from '@/shared/ui/states'

export function UsersListPage() {
  const { state, setPage, setSearch, setRole, setStatus, setSort } = useUsersListParams()
  const query: UsersQueryInput = useMemo(
    () => ({
      q: state.q || undefined,
      role: state.role,
      status: state.status,
      sort: state.sort,
      order: state.order,
      page: state.page,
    }),
    [state],
  )
  const { data } = useUsers(query)

  // A page past the end (e.g. ?page=99) is replaced with the last page (SPEC F1).
  const lastPage = data ? lastPageOf(data.total, data.pageSize) : undefined
  useEffect(() => {
    if (lastPage !== undefined && data?.page === state.page && state.page > lastPage) {
      setPage(lastPage, { replace: true })
    }
  }, [data?.page, lastPage, state.page, setPage])

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      <UsersToolbar
        state={state}
        onSearch={setSearch}
        onRoleChange={setRole}
        onStatusChange={setStatus}
        onSortChange={setSort}
      />
      {data ? (
        <>
          <UsersTable users={data.data} />
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        </>
      ) : (
        <TableSkeleton rows={10} columns={5} label="Loading users" />
      )}
    </section>
  )
}
