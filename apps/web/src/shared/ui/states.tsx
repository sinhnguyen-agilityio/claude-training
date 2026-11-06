import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/Button'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-slate-200 ${className}`} />
}

/** Placeholder rows shown while a table loads, announced once as `label`. */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  label = 'Loading…',
}: {
  rows?: number
  columns?: number
  label?: string
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex gap-4">
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton key={column} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  titleAs: Title = 'p',
}: {
  title: string
  description?: string
  action?: ReactNode
  /** Use `h1` when the empty state is the whole page. */
  titleAs?: 'p' | 'h1' | 'h2'
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <Title className="text-base font-medium text-slate-800">{title}</Title>
      {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retrying = false,
}: {
  title?: string
  message?: string
  onRetry?: () => void
  retrying?: boolean
}) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center">
      <p className="text-base font-medium text-red-800">{title}</p>
      {message && <p className="mt-1 text-sm text-red-700">{message}</p>}
      {onRetry && (
        <Button className="mt-4" onClick={onRetry} disabled={retrying}>
          {retrying ? 'Retrying…' : 'Retry'}
        </Button>
      )}
    </div>
  )
}
