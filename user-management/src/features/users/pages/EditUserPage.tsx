import { useNavigate, useParams } from 'react-router'
import { isApiError } from '@/features/users/api/client'
import { useUpdateUser, useUser } from '@/features/users/api/hooks'
import { UserForm } from '@/features/users/components/UserForm'
import { UserNotFound } from '@/features/users/components/UserNotFound'
import { toFormValues } from '@/features/users/formValues'
import { fullName } from '@/features/users/labels'
import { ErrorState, Skeleton } from '@/shared/ui/states'
import { useToast } from '@/shared/ui/useToast'

/** Edits a user with the create form, pre-filled (SPEC F4). */
export function EditUserPage() {
  const { id = '' } = useParams()
  const { data: user, error, refetch, isFetching } = useUser(id)
  const updateUser = useUpdateUser()
  const { showToast } = useToast()
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
      <section role="status" aria-label="Loading user" className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72 w-full" />
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Edit {fullName(user)}</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <UserForm
          // Re-initialise the form if the stored user changes underneath it.
          key={user.updatedAt}
          defaultValues={toFormValues(user)}
          submitLabel="Save changes"
          cancelTo={`/users/${user.id}`}
          requireChanges
          guardUnsavedChanges
          onSubmit={async (values) => {
            await updateUser.mutateAsync({ id: user.id, patch: values })
            showToast('User updated')
            await navigate(`/users/${user.id}`)
          }}
        />
      </div>
    </section>
  )
}
