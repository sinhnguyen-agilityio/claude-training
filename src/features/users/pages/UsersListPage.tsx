import { useEffect } from 'react'
import { useUsers } from '@/features/users/api/hooks'
import { Pagination } from '@/features/users/components/Pagination'
import { UsersTable } from '@/features/users/components/UsersTable'
import { useUsersListParams } from '@/features/users/hooks/useUsersListParams'
import { lastPageOf } from '@/features/users/query'
import { TableSkeleton } from '@/shared/ui/states'

export function UsersListPage() {
  const { query, setPage } = useUsersListParams()
  const { data } = useUsers(query)

  // A page past the end (e.g. ?page=99) is replaced with the last page (SPEC F1).
  const lastPage = data ? lastPageOf(data.total, data.pageSize) : undefined
  useEffect(() => {
    if (lastPage !== undefined && data?.page === query.page && query.page > lastPage) {
      setPage(lastPage, { replace: true })
    }
  }, [data?.page, lastPage, query.page, setPage])

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
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
