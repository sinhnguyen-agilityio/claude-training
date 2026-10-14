import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useResetData } from '@/features/users/api/hooks'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { useToast } from '@/shared/ui/useToast'

/** Header button that restores the seed data after a confirmation (SPEC F6). */
export function ResetDataButton() {
  const [confirming, setConfirming] = useState(false)
  const resetData = useResetData()
  const { showToast } = useToast()
  const navigate = useNavigate()

  async function confirm() {
    try {
      await resetData.mutateAsync()
      setConfirming(false)
      showToast('Demo data reset')
      // The dialog already warned that all changes are lost, so skip the unsaved-changes prompt.
      await navigate('/users', { state: { discardChanges: true } })
    } catch (error) {
      setConfirming(false)
      const reason = error instanceof Error ? error.message : 'Something went wrong'
      showToast(`Could not reset demo data: ${reason}`, 'error')
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setConfirming(true)}>
        Reset demo data
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Reset demo data?"
        description="All users you added, edited or deleted are restored to the original 25. Any unsaved changes are lost."
        confirmLabel="Reset"
        tone="danger"
        pending={resetData.isPending}
        onConfirm={() => void confirm()}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}
