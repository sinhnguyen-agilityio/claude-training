import { Link } from 'react-router'
import { RoleBadge, StatusBadge } from '@/features/users/components/Badges'
import { DeleteUserButton } from '@/features/users/components/DeleteUserButton'
import { fullName } from '@/features/users/labels'
import type { User } from '@/features/users/schema'
import { formatDate } from '@/shared/lib/format'

const linkClass =
  'rounded text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600'

/** The users table (SPEC F1). On narrow screens it scrolls inside its own container. */
export function UsersTable({ users }: { users: User[] }) {
  return (
    // `relative` keeps absolutely positioned sr-only text inside the scroll container.
    <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">Users</caption>
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
          <tr>
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
