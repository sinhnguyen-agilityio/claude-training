import { describe, expect, it } from 'vitest'
import { buildUsersCsv, CSV_HEADER, usersCsvFilename } from '@/features/users/exportCsv'
import type { User } from '@/features/users/schema'

function user(overrides: Partial<User> = {}): User {
  return {
    id: '7b0f6d2e-0000-4000-8000-000000000001',
    firstName: 'Anna',
    lastName: 'Lee',
    email: 'anna@example.com',
    phone: null,
    role: 'admin',
    status: 'active',
    createdAt: '2026-01-02T03:04:05.000Z',
    updatedAt: '2026-02-03T04:05:06.000Z',
    ...overrides,
  }
}

/** The file without its BOM, split into lines (header first, then one entry per user). */
function lines(users: User[]) {
  return buildUsersCsv(users).slice(1).split('\r\n')
}

describe('buildUsersCsv', () => {
  it('starts with a BOM and the exact header, and ends with one CRLF', () => {
    const csv = buildUsersCsv([user()])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(lines([user()])[0]).toBe(
      'First name,Last name,Email,Phone,Role,Status,Created at,Updated at',
    )
    expect(CSV_HEADER).toHaveLength(8)
    expect(csv.endsWith('\r\n')).toBe(true)
    expect(csv.endsWith('\r\n\r\n')).toBe(false)
  })

  it('writes only the header for no users', () => {
    const csv = buildUsersCsv([])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1)).toBe(
      'First name,Last name,Email,Phone,Role,Status,Created at,Updated at\r\n',
    )
  })

  it('writes stored values, an empty cell for a null phone, and dates as given', () => {
    expect(lines([user()])[1]).toBe(
      'Anna,Lee,anna@example.com,,admin,active,2026-01-02T03:04:05.000Z,2026-02-03T04:05:06.000Z',
    )
  })

  it('keeps accents as they are', () => {
    expect(lines([user({ firstName: 'Zoë', lastName: 'Nguyễn' })])[1]).toMatch(/^Zoë,Nguyễn,/)
  })

  it.each([
    ['a comma', 'Lee, Jr', '"Lee, Jr"'],
    ['a double quote', 'The "Boss"', '"The ""Boss"""'],
    ['an LF', 'a\nb', '"a\nb"'],
    ['a CR', 'a\rb', '"a\rb"'],
  ])('wraps a value containing %s in quotes', (_name, value, expected) => {
    expect(buildUsersCsv([user({ lastName: value })])).toContain(`,${expected},`)
  })

  it.each(['=', '+', '-', '@', '\t'])(
    'prefixes a cell starting with %j with a single quote, in any column',
    (char) => {
      const csv = buildUsersCsv([user({ firstName: `${char}x`, email: `${char}e@x.co` })])
      expect(csv).toContain(`'${char}x,`)
      expect(csv).toContain(`'${char}e@x.co,`)
    },
  )

  it('prefixes and then quotes a cell starting with CR', () => {
    expect(buildUsersCsv([user({ firstName: '\rx' })])).toContain('"\'\rx",')
  })

  it('guards before quoting, so a formula containing a comma is still neutralised', () => {
    expect(buildUsersCsv([user({ firstName: '=SUM(A1,A2)' })])).toContain(`"'=SUM(A1,A2)"`)
  })

  it('leaves a cell that merely contains a formula character alone', () => {
    expect(lines([user({ lastName: 'Smith-Jones' })])[1]).toContain(',Smith-Jones,')
  })

  describe('Phone exemption', () => {
    it.each(['+84 912 345 678', '+84912345678', '+1'])('writes %s as is', (phone) => {
      expect(lines([user({ phone })])[1]).toContain(`,${phone},`)
    })

    it.each(['+84-912-345-678', '-5551234', '+84  912', '+ 84', '+84 912 ', '=1+1', '@1'])(
      'prefixes %j with a quote',
      (phone) => {
        expect(lines([user({ phone })])[1]).toContain(`,'${phone},`)
      },
    )

    it('writes a phone that does not start with a formula character as is', () => {
      expect(lines([user({ phone: '(555) 123-4567' })])[1]).toContain(',(555) 123-4567,')
    })
  })
})

describe('usersCsvFilename', () => {
  it('uses the local date, zero-padded', () => {
    expect(usersCsvFilename(new Date(2026, 0, 5, 23, 59))).toBe('users-2026-01-05.csv')
    expect(usersCsvFilename(new Date(2026, 11, 31, 0, 1))).toBe('users-2026-12-31.csv')
  })
})
