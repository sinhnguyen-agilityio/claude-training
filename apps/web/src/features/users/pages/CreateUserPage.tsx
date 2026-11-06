import { useNavigate } from 'react-router'
import { useCreateUser } from '@/features/users/api/hooks'
import { UserForm } from '@/features/users/components/UserForm'
import { useToast } from '@/shared/ui/useToast'

export function CreateUserPage() {
  const createUser = useCreateUser()
  const { showToast } = useToast()
  const navigate = useNavigate()

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Add user</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <UserForm
          submitLabel="Create user"
          cancelTo="/users"
          onSubmit={async (values) => {
            await createUser.mutateAsync(values)
            showToast('User created')
            await navigate('/users')
          }}
        />
      </div>
    </section>
  )
}
