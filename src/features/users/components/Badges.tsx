import { roleLabels, statusLabels } from '@/features/users/labels'
import type { UserRole, UserStatus } from '@/features/users/schema'

const roleStyles: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800',
  editor: 'bg-blue-100 text-blue-800',
  viewer: 'bg-slate-100 text-slate-700',
}

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${roleStyles[role]}`}
    >
      {roleLabels[role]}
    </span>
  )
}

export function StatusBadge({ status }: { status: UserStatus }) {
  const active = status === 'active'
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${active ? 'bg-green-500' : 'bg-slate-400'}`}
      />
      {statusLabels[status]}
    </span>
  )
}
