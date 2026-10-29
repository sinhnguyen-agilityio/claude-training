import { useExportUsers } from '@/features/users/api/hooks'
import { buildUsersCsv, usersCsvFilename } from '@/features/users/exportCsv'
import type { UsersExportQueryInput } from '@/features/users/query'
import { downloadBlob } from '@/shared/lib/download'
import { Button } from '@/shared/ui/Button'
import { Tooltip } from '@/shared/ui/Tooltip'
import { useToast } from '@/shared/ui/useToast'

export interface ExportCsvButtonProps {
  /** The list filters and sort; the export is never limited to the visible page. */
  query: UsersExportQueryInput
  /** True while the list is loading, empty or in its error state. */
  unavailable: boolean
}

/** The secondary look without its hover, dimmed. `disabled:` styles do not apply to `aria-disabled`. */
const UNAVAILABLE_CLASSES =
  'cursor-not-allowed border border-slate-300 bg-white text-slate-800 opacity-50'

/** Toolbar button that downloads the filtered users as a CSV file (SPEC F8). */
export function ExportCsvButton({ query, unavailable }: ExportCsvButtonProps) {
  const exportUsers = useExportUsers()
  const { showToast } = useToast()
  const pending = exportUsers.isPending

  async function handleClick() {
    // `aria-disabled` keeps the button focusable, so the click is ignored here instead.
    if (unavailable || pending) return
    try {
      const { data } = await exportUsers.mutateAsync(query)
      if (data.length === 0) {
        // The list changed since it was fetched: a header-only file would be misleading.
        showToast('No users to export', 'error')
        return
      }
      const blob = new Blob([buildUsersCsv(data)], { type: 'text/csv;charset=utf-8' })
      downloadBlob(blob, usersCsvFilename())
    } catch (error) {
      // Awaited rather than passed as a `mutate` callback, which is dropped if the list page
      // unmounts first. Building the file can fail too, and that is also "Export failed".
      console.error('Export failed', error)
      showToast('Export failed', 'error')
    }
  }

  return (
    <Tooltip content={unavailable ? 'No users to export' : undefined}>
      {(describedBy) => (
        <Button
          // `bare` has no hover of its own, so the disabled look cannot lose to the variant's.
          variant={unavailable ? 'bare' : 'secondary'}
          aria-disabled={unavailable || undefined}
          aria-busy={pending || undefined}
          aria-describedby={unavailable ? describedBy : undefined}
          className={unavailable ? UNAVAILABLE_CLASSES : undefined}
          onClick={() => void handleClick()}
        >
          {pending ? 'Exporting…' : 'Export CSV'}
        </Button>
      )}
    </Tooltip>
  )
}
