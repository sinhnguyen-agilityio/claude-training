import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { Link } from 'react-router'
import { isApiError } from '@/features/users/api/client'
import { emptyUserFormValues, type UserFormValues } from '@/features/users/formValues'
import { roleOptions, statusOptions } from '@/features/users/labels'
import { userCreateSchema, type UserCreate } from '@/features/users/schema'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { SelectField, TextField } from '@/shared/ui/fields'

const fieldNames = ['firstName', 'lastName', 'email', 'phone', 'role', 'status'] as const

// The schema's input type does not allow an empty role; the form does until it is validated.
const resolver = zodResolver(userCreateSchema) as unknown as Resolver<
  UserFormValues,
  unknown,
  UserCreate
>

export interface UserFormProps {
  defaultValues?: UserFormValues
  submitLabel: string
  cancelTo: string
  /** Throwing an ApiError maps its `fieldErrors` onto the fields (e.g. 409 on email). */
  onSubmit: (values: UserCreate) => Promise<void>
  /** Keeps Submit disabled until a value differs from `defaultValues` (SPEC F4). */
  requireChanges?: boolean
  /** Asks before leaving with unsaved changes (SPEC F4). */
  guardUnsavedChanges?: boolean
}

/** The create/edit user form (SPEC F2, F4). Errors show after blur or submit. */
export function UserForm({
  defaultValues = emptyUserFormValues,
  submitLabel,
  cancelTo,
  onSubmit,
  requireChanges = false,
  guardUnsavedChanges = false,
}: UserFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UserFormValues, unknown, UserCreate>({
    resolver,
    defaultValues,
    mode: 'onTouched',
  })
  const { blocker, allowNavigation } = useUnsavedChangesGuard(guardUnsavedChanges && isDirty)

  const submit = handleSubmit(async (values) => {
    // The page navigates away after a successful save; that must not trigger the guard.
    allowNavigation()
    try {
      await onSubmit(values)
    } catch (error) {
      allowNavigation(false)
      const fieldErrors = isApiError(error) ? Object.entries(error.fieldErrors) : []
      const known = fieldErrors.filter(([field]) => fieldNames.includes(field as never))
      for (const [field, message] of known) {
        setError(field as (typeof fieldNames)[number], { message }, { shouldFocus: true })
      }
      if (known.length === 0) {
        setError('root', {
          message: error instanceof Error ? error.message : 'Something went wrong',
        })
      }
    }
  })

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {errors.root && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          {errors.root.message}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="First name"
          autoComplete="given-name"
          required
          error={errors.firstName?.message}
          {...register('firstName')}
        />
        <TextField
          label="Last name"
          autoComplete="family-name"
          required
          error={errors.lastName?.message}
          {...register('lastName')}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Phone"
          type="tel"
          autoComplete="tel"
          hint="Optional. Digits, spaces, +, - and ()"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <SelectField
          label="Role"
          options={roleOptions}
          placeholder="Choose a role"
          required
          error={errors.role?.message}
          {...register('role')}
        />
        <SelectField
          label="Status"
          options={statusOptions}
          required
          error={errors.status?.message}
          {...register('status')}
        />
      </div>
      <div className="flex justify-end gap-3">
        <Link
          to={cancelTo}
          className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          Cancel
        </Link>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || (requireChanges && !isDirty)}
        >
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Discard unsaved changes?"
        description="You have changes that have not been saved. If you leave now, they will be lost."
        confirmLabel="Leave page"
        cancelLabel="Stay"
        tone="danger"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </form>
  )
}
