import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import { userCreateSchema, userSchema, userUpdateSchema } from '@/features/users/schema'

const validInput = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '+1 (555) 123-4567',
  role: 'editor',
  status: 'inactive',
}

/** Returns the first error message for `field`, or undefined when it is valid. */
function fieldError(result: z.ZodSafeParseResult<unknown>, field: string) {
  return result.error?.issues.find((issue) => issue.path[0] === field)?.message
}

describe('userCreateSchema', () => {
  it('accepts valid input unchanged', () => {
    expect(userCreateSchema.parse(validInput)).toEqual(validInput)
  })

  describe.each([
    ['firstName', 'First name'],
    ['lastName', 'Last name'],
  ] as const)('%s', (field, label) => {
    it('trims surrounding spaces', () => {
      expect(userCreateSchema.parse({ ...validInput, [field]: '  Ann  ' })[field]).toBe('Ann')
    })

    it.each([
      ['missing', undefined, `${label} is required`],
      ['empty', '', `${label} is required`],
      ['only spaces', '   ', `${label} is required`],
      ['51 characters', 'a'.repeat(51), `${label} must be at most 50 characters`],
    ])('rejects %s', (_case, value, message) => {
      const result = userCreateSchema.safeParse({ ...validInput, [field]: value })
      expect(fieldError(result, field)).toBe(message)
    })

    it('accepts exactly 50 characters', () => {
      const result = userCreateSchema.safeParse({ ...validInput, [field]: 'a'.repeat(50) })
      expect(result.success).toBe(true)
    })
  })

  describe('email', () => {
    it('trims and lowercases', () => {
      const parsed = userCreateSchema.parse({ ...validInput, email: '  John@Example.COM ' })
      expect(parsed.email).toBe('john@example.com')
    })

    it.each([
      ['missing', undefined, 'Email is required'],
      ['empty', '', 'Email is required'],
      ['only spaces', '   ', 'Email is required'],
      ['not an email', 'jane.example.com', 'Enter a valid email address'],
      ['missing domain', 'jane@', 'Enter a valid email address'],
    ])('rejects %s', (_case, value, message) => {
      const result = userCreateSchema.safeParse({ ...validInput, email: value })
      expect(fieldError(result, 'email')).toBe(message)
    })
  })

  describe('phone', () => {
    it.each([
      ['missing', undefined],
      ['null', null],
      ['empty', ''],
      ['only spaces', '   '],
    ])('stores %s as null', (_case, value) => {
      expect(userCreateSchema.parse({ ...validInput, phone: value }).phone).toBeNull()
    })

    it.each([
      ['formatted', '+1 (555) 123-4567'],
      ['7 characters', '555-123'],
      ['20 characters', '+84 (90) 123-456-789'],
    ])('accepts %s', (_case, value) => {
      expect(userCreateSchema.parse({ ...validInput, phone: value }).phone).toBe(value)
    })

    it('trims surrounding spaces', () => {
      expect(userCreateSchema.parse({ ...validInput, phone: ' 5551234 ' }).phone).toBe('5551234')
    })

    it.each([
      ['letters', '555-12ab', 'Phone may only contain digits, spaces, +, - and ()'],
      ['6 characters', '555123', 'Phone must be at least 7 characters'],
      ['21 characters', '1'.repeat(21), 'Phone must be at most 20 characters'],
    ])('rejects %s', (_case, value, message) => {
      const result = userCreateSchema.safeParse({ ...validInput, phone: value })
      expect(fieldError(result, 'phone')).toBe(message)
    })
  })

  describe('role', () => {
    it.each(['admin', 'editor', 'viewer'])('accepts %s', (role) => {
      expect(userCreateSchema.parse({ ...validInput, role }).role).toBe(role)
    })

    it.each([undefined, 'owner', ''])('rejects %j', (role) => {
      const result = userCreateSchema.safeParse({ ...validInput, role })
      expect(fieldError(result, 'role')).toBe('Choose a role')
    })
  })

  describe('status', () => {
    it('defaults to active', () => {
      const { status: _omit, ...withoutStatus } = validInput
      expect(userCreateSchema.parse(withoutStatus).status).toBe('active')
    })

    it('rejects an unknown status', () => {
      const result = userCreateSchema.safeParse({ ...validInput, status: 'banned' })
      expect(fieldError(result, 'status')).toBe('Choose a status')
    })
  })

  it('drops unknown keys such as id or createdAt', () => {
    const parsed = userCreateSchema.parse({ ...validInput, id: 'x', createdAt: 'y' })
    expect(parsed).not.toHaveProperty('id')
    expect(parsed).not.toHaveProperty('createdAt')
  })
})

describe('userUpdateSchema', () => {
  it('accepts an empty patch without applying defaults', () => {
    expect(userUpdateSchema.parse({})).toEqual({})
  })

  it('normalises only the fields that are sent', () => {
    expect(userUpdateSchema.parse({ email: ' A@B.CO ', phone: '' })).toEqual({
      email: 'a@b.co',
      phone: null,
    })
  })

  it('applies the same rules as create', () => {
    const result = userUpdateSchema.safeParse({ firstName: '', role: 'owner' })
    expect(fieldError(result, 'firstName')).toBe('First name is required')
    expect(fieldError(result, 'role')).toBe('Choose a role')
  })
})

describe('userSchema', () => {
  const storedUser = {
    ...validInput,
    id: '3f2b8c1e-7a4d-4e5f-9b6a-1c2d3e4f5a6b',
    createdAt: '2026-10-14T09:30:00.000Z',
    updatedAt: '2026-10-14T10:00:00.000Z',
  }

  it('accepts a stored user', () => {
    expect(userSchema.parse(storedUser)).toEqual(storedUser)
  })

  it.each([
    ['id', 'not-a-uuid'],
    ['createdAt', '14/10/2026'],
    ['updatedAt', undefined],
  ])('rejects an invalid %s', (field, value) => {
    const result = userSchema.safeParse({ ...storedUser, [field]: value })
    expect(fieldError(result, field)).toBeDefined()
  })
})
