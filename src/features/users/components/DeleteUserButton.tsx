import { useState } from 'react'
import { useDeleteUser } from '@/features/users/api/hooks'
import { fullName } from '@/features/users/labels'
import type { User } from '@/features/users/schema'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { useToast } from '@/shared/ui/useToast'

export interface DeleteUserButtonProps {
  user: User
  /** Called after a successful delete, e.g. to leave the detail page. */
  onDeleted?: () => void
  /** `text`: red text that turns bold and blue on hover, e.g. in a table row. */
  appearance?: 'button' | 'text'
}

const textClass =
  'text-red-700 enabled:cursor-pointer enabled:hover:font-bold enabled:hover:text-[#1d4ed8]'
// A hidden bold copy of the label reserves its width, so going bold never resizes the button.
const reserveBoldWidthClass =
  'inline-flex flex-col after:invisible after:h-0 after:overflow-hidden after:font-bold after:content-[attr(data-label)]'

/** Delete with a confirmation that names the user (SPEC F5). */
export function DeleteUserButton({
  user,
  onDeleted,
  appearance = 'button',
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
        variant={appearance === 'text' ? 'bare' : 'danger'}
        className={appearance === 'text' ? textClass : ''}
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${name}`}
      >
        {appearance === 'text' ? (
          <span data-label="Delete" className={reserveBoldWidthClass}>
            Delete
          </span>
        ) : (
          'Delete'
        )}
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
