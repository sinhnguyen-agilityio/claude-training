import { lastPageOf } from '@/features/users/query'
import { Button } from '@/shared/ui/Button'

export interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

/** "Showing X–Y of Z" plus Previous / Next (SPEC F1). */
export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const lastPage = lastPageOf(total, pageSize)
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700"
    >
      <p>
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-3">
        <span>
          Page {page} of {lastPage}
        </span>
        <Button onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous
        </Button>
        <Button onClick={() => onPageChange(page + 1)} disabled={page >= lastPage}>
          Next
        </Button>
      </div>
    </nav>
  )
}
