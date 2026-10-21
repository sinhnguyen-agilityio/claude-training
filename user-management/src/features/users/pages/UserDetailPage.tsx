import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { isApiError } from '@/features/users/api/client'
import { useUser } from '@/features/users/api/hooks'
import { RoleBadge, StatusBadge } from '@/features/users/components/Badges'
import { DeleteUserButton } from '@/features/users/components/DeleteUserButton'
import { UserNotFound } from '@/features/users/components/UserNotFound'
import { fullName } from '@/features/users/labels'
import { lastListPath } from '@/features/users/listLocation'
import { formatDateTime } from '@/shared/lib/format'
import { ErrorState, Skeleton } from '@/shared/ui/states'

const actionLinkClass =
  'inline-flex items-center rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'

/** Shows one user with Edit and Delete actions (SPEC F3). */
export function UserDetailPage() {
  const { id = '' } = useParams()
  const { data: user, error, refetch, isFetching } = useUser(id)
  const navigate = useNavigate()

  if (isApiError(error, 404)) return <UserNotFound />

  if (error) {
    return (
      <ErrorState
        title="Could not load user"
        message={error.message}
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    )
  }

  if (!user) {
    return (
      <section role="status" aria-label="Loading user" className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <Link to={lastListPath()} className="text-sm text-blue-700 hover:underline">
        ← Back to users
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{fullName(user)}</h1>
        <div className="flex gap-3">
          <Link
            to={`/users/${user.id}/edit`}
            className={`${actionLinkClass} bg-blue-600 text-white hover:bg-blue-700`}
          >
            Edit
          </Link>
          <DeleteUserButton user={user} onDeleted={() => void navigate(lastListPath())} />
        </div>
      </div>
      <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        <Row label="First name">{user.firstName}</Row>
        <Row label="Last name">{user.lastName}</Row>
        <Row label="Email">
          <a href={`mailto:${user.email}`} className="text-blue-700 hover:underline">
            {user.email}
          </a>
        </Row>
        <Row label="Phone">{user.phone ?? '—'}</Row>
        <Row label="Role">
          <RoleBadge role={user.role} />
        </Row>
        <Row label="Status">
          <StatusBadge status={user.status} />
        </Row>
        <Row label="Created">
          <time dateTime={user.createdAt}>{formatDateTime(user.createdAt)}</time>
        </Row>
        <Row label="Updated">
          <time dateTime={user.updatedAt}>{formatDateTime(user.updatedAt)}</time>
        </Row>
      </dl>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      <dd className="text-sm text-slate-900 sm:col-span-2">{children}</dd>
    </div>
  )
}
