import { useState } from 'react'
import { useDeleteUser } from '@/features/users/api/hooks'
import { fullName } from '@/features/users/labels'
import type { User } from '@/features/users/schema'
import { Button, type ButtonProps } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { useToast } from '@/shared/ui/useToast'

export interface DeleteUserButtonProps {
  user: User
  /** Called after a successful delete, e.g. to leave the detail page. */
  onDeleted?: () => void
  variant?: ButtonProps['variant']
  className?: string
}

/** Delete with a confirmation that names the user (SPEC F5). */
export function DeleteUserButton({
  user,
  onDeleted,
  variant = 'danger',
  className,
}: DeleteUserButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const deleteUser = useDeleteUser()
  const { showToast } = useToast()
  const name = fullName(user)

  async function confirm() {
    try {
      await deleteUser.mutateAsync(user.id)
      setConfirming(false)
      showToast('User deleted')
      onDeleted?.()
    } catch (error) {
      setConfirming(false)
      const reason = error instanceof Error ? error.message : 'Something went wrong'
      showToast(`Could not delete ${name}: ${reason}`, 'error')
    }
  }

  return (
    <>
      <Button
        variant={variant}
        className={className}
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${name}`}
      >
        Delete
      </Button>
      <ConfirmDialog
        open={confirming}
        title={`Delete ${name}?`}
        description={`This permanently removes ${name} (${user.email}). This cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        pending={deleteUser.isPending}
        onConfirm={() => void confirm()}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}
