import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { isApiError } from '@/features/users/api/client'
import { useBulkUsers, userKeys, useUsers } from '@/features/users/api/hooks'
import type { BulkRequest } from '@/features/users/bulkSchema'
import { BulkActionBar } from '@/features/users/components/BulkActionBar'
import { Pagination } from '@/features/users/components/Pagination'
import { UsersTable } from '@/features/users/components/UsersTable'
import { UsersToolbar } from '@/features/users/components/UsersToolbar'
import { useUsersListParams } from '@/features/users/hooks/useUsersListParams'
import { rememberListSearch } from '@/features/users/listLocation'
import { lastPageOf, type UsersPage, type UsersQueryInput } from '@/features/users/query'
import type { UserStatus } from '@/features/users/schema'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { useToast } from '@/shared/ui/useToast'
import { EmptyState, ErrorState, TableSkeleton } from '@/shared/ui/states'

const usersLabel = (count: number) => `${count} ${count === 1 ? 'user' : 'users'}`

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
  const { data, error, refetch, isFetching, isPlaceholderData } = useUsers(query)

  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const bulk = useBulkUsers()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [focusTick, setFocusTick] = useState(0)

  // Selection is page-only: any change to the page, filters, sort or (debounced) search drops it
  // (SPEC F7). It is reset during render, so a request that finishes later cannot bring it back.
  const viewKey = JSON.stringify(query)
  const viewKeyRef = useRef(viewKey)
  // A layout effect, so the ref is current as soon as the new view is committed: no request can
  // resolve between the commit and the update.
  useLayoutEffect(() => {
    viewKeyRef.current = viewKey
  }, [viewKey])
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [selectedFor, setSelectedFor] = useState(viewKey)
  if (selectedFor !== viewKey) {
    setSelectedFor(viewKey)
    setSelected(new Set())
    // A dialog opened for the old selection must not outlive it.
    setConfirmingDelete(false)
  }

  // Rows can leave the page without the view changing (an edit or delete elsewhere), so only
  // the selected ids still listed count. Order follows the page.
  const selectedIds = useMemo(
    () => (data ? data.data.map((user) => user.id).filter((id) => selected.has(id)) : []),
    [data, selected],
  )
  const selectedOnPage = useMemo(() => new Set(selectedIds), [selectedIds])
  // The rows behind an open dialog can vanish (a refetch after a change elsewhere): close it
  // instead of offering to delete 0 users.
  if (confirmingDelete && selectedIds.length === 0) setConfirmingDelete(false)

  // Once the action bar is gone after an action, keyboard focus would be lost with it.
  useEffect(() => {
    if (focusTick > 0) headingRef.current?.focus()
  }, [focusTick])

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  function toggleAll() {
    const ids = data?.data.map((user) => user.id) ?? []
    setSelected(
      ids.length > 0 && ids.every((id) => selectedOnPage.has(id)) ? new Set() : new Set(ids),
    )
  }

  async function runBulk(request: BulkRequest) {
    const startedOn = viewKey
    const total = request.ids.length
    const verb = request.action === 'delete' ? 'deleted' : 'updated'
    const failure = `Could not ${request.action === 'delete' ? 'delete' : 'update'} ${usersLabel(total)}`
    let result
    try {
      result = await bulk.mutateAsync(request)
    } catch (error) {
      // The response may have been lost after the server applied the change, so refresh the
      // lists: selected users that no longer exist drop out of the selection.
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      showToast(
        isApiError(error) && error.status === 0 ? `${failure}. ${error.message}` : failure,
        'error',
      )
      return
    }

    const { succeeded, failed } = result
    if (succeeded.length === 0) {
      showToast(failure, 'error')
    } else {
      showToast(
        failed.length === 0
          ? `${usersLabel(total)} ${verb}`
          : `${succeeded.length} of ${total} ${verb}, ${failed.length} failed`,
        failed.length === 0 ? 'success' : 'warning',
      )
    }

    // The user moved on while the request ran: the selection stays cleared (SPEC F7).
    if (viewKeyRef.current !== startedOn) return
    const refreshed = queryClient.getQueryData<UsersPage>(userKeys.list(query))
    const stillListed = new Set(refreshed?.data.map((user) => user.id))
    const remaining = failed.map(({ id }) => id).filter((id) => stillListed.has(id))
    setSelected(new Set(remaining))
    if (remaining.length === 0) setFocusTick((tick) => tick + 1)
  }

  // Not `isFetching`: a background refetch must not disable inputs under the user's hands. Only
  // rows kept from the previous page while the next one loads (placeholder data) are off limits.
  const selectionDisabled = bulk.isPending || isPlaceholderData

  const { search } = useLocation()
  useEffect(() => rememberListSearch(search), [search])

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
          <BulkActionBar
            count={selectedIds.length}
            pending={bulk.isPending}
            onSetStatus={(status: UserStatus) =>
              void runBulk({ action: 'setStatus', ids: selectedIds, status })
            }
            onDelete={() => setConfirmingDelete(true)}
            onClear={() => setSelected(new Set())}
          />
          <UsersTable
            users={data.data}
            selectedIds={selectedOnPage}
            selectionDisabled={selectionDisabled}
            onToggle={toggle}
            onToggleAll={toggleAll}
          />
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
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold">
          Users
        </h1>
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
      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete ${usersLabel(selectedIds.length)}?`}
        description={`This permanently deletes ${usersLabel(selectedIds.length)} and cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false)
          void runBulk({ action: 'delete', ids: selectedIds })
        }}
      />
    </section>
  )
}
