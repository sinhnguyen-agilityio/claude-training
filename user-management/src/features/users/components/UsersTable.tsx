import { Link } from 'react-router'
import { RoleBadge, StatusBadge } from '@/features/users/components/Badges'
import { DeleteUserButton } from '@/features/users/components/DeleteUserButton'
import { fullName } from '@/features/users/labels'
import type { User } from '@/features/users/schema'
import { formatDate } from '@/shared/lib/format'
import { Checkbox } from '@/shared/ui/Checkbox'

const linkClass =
  'rounded text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600'

/** The users table (SPEC F1). On narrow screens it scrolls inside its own container. */
export function UsersTable({
  users,
  selectedIds,
  selectionDisabled,
  onToggle,
  onToggleAll,
}: {
  users: User[]
  selectedIds: ReadonlySet<string>
  /** Disables every checkbox, e.g. while a bulk request runs or the list is refetching. */
  selectionDisabled: boolean
  onToggle: (id: string) => void
  onToggleAll: () => void
}) {
  const selectedCount = users.filter((user) => selectedIds.has(user.id)).length
  const allSelected = users.length > 0 && selectedCount === users.length
  return (
    // `relative` keeps absolutely positioned sr-only text inside the scroll container.
    <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">Users</caption>
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th scope="col" className="w-10 px-4 py-3">
              <Checkbox
                label="Select all users on this page"
                checked={allSelected}
                indeterminate={selectedCount > 0 && !allSelected}
                disabled={selectionDisabled || users.length === 0}
                onChange={onToggleAll}
              />
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Name
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Email
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Role
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Created
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => {
            const name = fullName(user)
            return (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Checkbox
                    label={`Select ${name}`}
                    checked={selectedIds.has(user.id)}
                    disabled={selectionDisabled}
                    onChange={() => onToggle(user.id)}
                  />
                </td>
                <th scope="row" className="px-4 py-3 font-medium text-slate-900">
                  {name}
                </th>
                <td className="px-4 py-3 text-slate-700">{user.email}</td>
                <td className="px-4 py-3">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={user.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                  <time dateTime={user.createdAt}>{formatDate(user.createdAt)}</time>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                    <Link
                      to={`/users/${user.id}`}
                      className={linkClass}
                      aria-label={`View ${name}`}
                    >
                      View
                    </Link>
                    <Link
                      to={`/users/${user.id}/edit`}
                      className={linkClass}
                      aria-label={`Edit ${name}`}
                    >
                      Edit
                    </Link>
                    <DeleteUserButton user={user} appearance="text" />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
