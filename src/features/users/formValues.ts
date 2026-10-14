import type { User, UserRole, UserStatus } from '@/features/users/schema'

/** Raw values of the user form. `role` starts empty so the user has to choose one. */
export interface UserFormValues {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: UserRole | ''
  status: UserStatus
}

export const emptyUserFormValues: UserFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: '',
  status: 'active',
}

/** Pre-fills the form from a stored user (SPEC F4). */
export function toFormValues(user: User): UserFormValues {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? '',
    role: user.role,
    status: user.status,
  }
}
