import { Link } from 'react-router'
import { EmptyState } from '@/shared/ui/states'

/** Shown for an unknown user id (SPEC F3, F4). */
export function UserNotFound() {
  return (
    <section className="mx-auto max-w-xl">
      <EmptyState
        title="User not found"
        titleAs="h1"
        description="This user may have been deleted, or the link is wrong."
        action={
          <Link to="/users" className="text-sm font-medium text-blue-700 hover:underline">
            Back to users
          </Link>
        }
      />
    </section>
  )
}
