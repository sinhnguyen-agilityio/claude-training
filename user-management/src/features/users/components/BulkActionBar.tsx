import type { UserStatus } from '@/features/users/schema'
import { Button } from '@/shared/ui/Button'

interface BulkActionBarProps {
  count: number
  pending: boolean
  onSetStatus: (status: UserStatus) => void
  onDelete: () => void
  onClear: () => void
}

/** Actions for the selected rows (SPEC F7). Wraps onto two rows on narrow screens. */
export function BulkActionBar({
  count,
  pending,
  onSetStatus,
  onDelete,
  onClear,
}: BulkActionBarProps) {
  return (
    // Always mounted and only hidden at 0, so the live region exists before its first text and
    // screen readers announce the first selection too.
    <div
      hidden={count === 0}
      aria-busy={pending}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
    >
      <p role="status" className="mr-auto text-sm font-medium text-slate-900">
        {count > 0 ? `${count} selected` : ''}
      </p>
      <Button disabled={pending} onClick={() => onSetStatus('active')}>
        Set active
      </Button>
      <Button disabled={pending} onClick={() => onSetStatus('inactive')}>
        Set inactive
      </Button>
      <Button variant="danger" disabled={pending} onClick={onDelete}>
        Delete
      </Button>
      <Button variant="ghost" disabled={pending} onClick={onClear}>
        Clear selection
      </Button>
    </div>
  )
}
