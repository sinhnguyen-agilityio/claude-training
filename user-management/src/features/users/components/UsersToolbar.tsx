import { useEffect, useState, type ReactNode } from 'react'
import type { UsersListState } from '@/features/users/hooks/useUsersListParams'
import { roleOptions, statusOptions } from '@/features/users/labels'
import type { SortOrder, UsersSortField } from '@/features/users/query'
import { USER_ROLES, USER_STATUSES, type UserRole, type UserStatus } from '@/features/users/schema'
import { SelectField, TextField } from '@/shared/ui/fields'

export const SEARCH_DEBOUNCE_MS = 300

const sortOptions = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'name:desc', label: 'Name Z–A' },
] as const

type SortValue = (typeof sortOptions)[number]['value']

export interface UsersToolbarProps {
  state: UsersListState
  onSearch: (q: string) => void
  onRoleChange: (role: UserRole | undefined) => void
  onStatusChange: (status: UserStatus | undefined) => void
  onSortChange: (sort: UsersSortField, order: SortOrder) => void
  /** Rendered on its own row below the controls, e.g. the Export CSV button. */
  action?: ReactNode
}

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value)
}

/** Search, role/status filters and sort for the users list (SPEC F1). */
export function UsersToolbar({
  state,
  onSearch,
  onRoleChange,
  onStatusChange,
  onSortChange,
  action,
}: UsersToolbarProps) {
  return (
    <div role="search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
      <SearchBox value={state.q} onChange={onSearch} />
      <SelectField
        label="Role"
        options={roleOptions}
        placeholder="All roles"
        value={state.role ?? ''}
        onChange={(event) => {
          const { value } = event.target
          onRoleChange(isOneOf(USER_ROLES, value) ? value : undefined)
        }}
      />
      <SelectField
        label="Status"
        options={statusOptions}
        placeholder="All statuses"
        value={state.status ?? ''}
        onChange={(event) => {
          const { value } = event.target
          onStatusChange(isOneOf(USER_STATUSES, value) ? value : undefined)
        }}
      />
      <SelectField
        label="Sort by"
        options={sortOptions}
        value={`${state.sort}:${state.order}`}
        onChange={(event) => {
          const [sort, order] = (event.target.value as SortValue).split(':') as [
            UsersSortField,
            SortOrder,
          ]
          onSortChange(sort, order)
        }}
      />
      {action && <div className="flex justify-end sm:col-span-2 lg:col-span-4">{action}</div>}
    </div>
  )
}

/**
 * Keeps what the user types locally and reports it after a 300 ms pause, so typing quickly
 * makes a single request. Follows `value` when it changes from outside (e.g. Clear filters).
 */
function SearchBox({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [text, setText] = useState(value)
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setText(value)
  }

  useEffect(() => {
    if (text === value) return
    const timer = setTimeout(() => onChange(text), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, value, onChange])

  return (
    <TextField
      label="Search"
      type="search"
      placeholder="First name, last name or email"
      value={text}
      onChange={(event) => setText(event.target.value)}
    />
  )
}
