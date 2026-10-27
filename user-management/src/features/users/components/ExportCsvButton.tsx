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
      const blob = new Blob([buildUsersCsv(data)], { type: 'text/csv;charset=utf-8' })
      downloadBlob(blob, usersCsvFilename())
    } catch {
      // Awaited rather than passed as a `mutate` callback, which is dropped if the list page
      // unmounts first. Building the file can fail too, and that is also "Export failed".
      showToast('Export failed', 'error')
    }
  }

  return (
    <Tooltip content={unavailable ? 'No users to export' : undefined}>
      {(describedBy) => (
        <Button
          aria-disabled={unavailable || undefined}
          aria-busy={pending || undefined}
          aria-describedby={unavailable ? describedBy : undefined}
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-white"
          onClick={() => void handleClick()}
        >
          {pending ? 'Exporting…' : 'Export CSV'}
        </Button>
      )}
    </Tooltip>
  )
}
