import { describe, expect, it } from 'vitest'
import { toFormValues } from '@/features/users/formValues'
import { seedUsers } from '@/mocks/seed'

describe('toFormValues', () => {
  it('copies the editable fields and turns a null phone into an empty string', () => {
    expect(toFormValues(seedUsers[2]!)).toEqual({
      firstName: 'Lan',
      lastName: 'Nguyen',
      email: 'lan.nguyen@example.com',
      phone: '',
      role: 'viewer',
      status: 'inactive',
    })
    expect(toFormValues(seedUsers[0]!).phone).toBe('+48 22 123 4567')
  })
})
