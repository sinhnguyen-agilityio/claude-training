import { useEffect, useMemo } from 'react'
import { Link } from 'react-router'
import { useUsers } from '@/features/users/api/hooks'
import { Pagination } from '@/features/users/components/Pagination'
import { UsersTable } from '@/features/users/components/UsersTable'
import { UsersToolbar } from '@/features/users/components/UsersToolbar'
import { useUsersListParams } from '@/features/users/hooks/useUsersListParams'
import { lastPageOf, type UsersQueryInput } from '@/features/users/query'
import { Button } from '@/shared/ui/Button'
import { EmptyState, ErrorState, TableSkeleton } from '@/shared/ui/states'

export function UsersListPage() {
  const { state, hasFilters, setPage, setSearch, setRole, setStatus, setSort, clearFilters } =
    useUsersListParams()
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
  const { data, error, refetch, isFetching } = useUsers(query)

  // A page past the end (e.g. ?page=99) is replaced with the last page (SPEC F1).
  const lastPage = data ? lastPageOf(data.total, data.pageSize) : undefined
  useEffect(() => {
    if (lastPage !== undefined && data?.page === state.page && state.page > lastPage) {
      setPage(lastPage, { replace: true })
    }
  }, [data?.page, lastPage, state.page, setPage])

  function renderResults() {
    if (data) {
      if (data.total === 0) {
        return hasFilters ? (
          <EmptyState
            title="No users match your filters"
            description="Try a different search, or clear the filters."
            action={<Button onClick={clearFilters}>Clear filters</Button>}
          />
        ) : (
          <EmptyState title="No users yet" />
        )
      }
      return (
        <>
          <UsersTable users={data.data} />
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        </>
      )
    }
    if (error) {
      return (
        <ErrorState
          title="Could not load users"
          message={error.message}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      )
    }
    return <TableSkeleton rows={10} columns={5} label="Loading users" />
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Link
          to="/users/new"
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Add user
        </Link>
      </div>
      <UsersToolbar
        state={state}
        onSearch={setSearch}
        onRoleChange={setRole}
        onStatusChange={setStatus}
        onSortChange={setSort}
      />
      {renderResults()}
    </section>
  )
}
