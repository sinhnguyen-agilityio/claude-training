import type { SelectOption } from '@/shared/ui/fields'
import { USER_ROLES, USER_STATUSES, type UserRole, type UserStatus } from '@/features/users/schema'

export const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
}

export const statusLabels: Record<UserStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

export const roleOptions: SelectOption[] = USER_ROLES.map((value) => ({
  value,
  label: roleLabels[value],
}))
export const statusOptions: SelectOption[] = USER_STATUSES.map((value) => ({
  value,
  label: statusLabels[value],
}))

export function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`
}
