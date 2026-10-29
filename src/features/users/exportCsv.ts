import type { User } from '@/features/users/schema'

/** CSV export of the users list (SPEC F8). */

// Built from the code point, because an invisible literal character is easy to lose in an edit.
const BOM = String.fromCharCode(0xfeff)
const EOL = '\r\n'
export const CSV_HEADER = [
  'First name',
  'Last name',
  'Email',
  'Phone',
  'Role',
  'Status',
  'Created at',
  'Updated at',
] as const

/** Characters that make a spreadsheet read a cell as a formula. */
const FORMULA_START = /^[=+\-@\t\r]/
/** An international phone number is written as is, so it stays a readable number (SPEC F8). */
const INTERNATIONAL_PHONE = /^\+[0-9]+( [0-9]+)*$/

function guardFormula(value: string, exempt = false) {
  return FORMULA_START.test(value) && !exempt ? `'${value}` : value
}

function quote(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

function cell(value: string, { exempt = false } = {}) {
  return quote(guardFormula(value, exempt))
}

function row(user: User) {
  return [
    cell(user.firstName),
    cell(user.lastName),
    cell(user.email),
    cell(user.phone ?? '', { exempt: INTERNATIONAL_PHONE.test(user.phone ?? '') }),
    cell(user.role),
    cell(user.status),
    cell(user.createdAt),
    cell(user.updatedAt),
  ].join(',')
}

/** The file content: UTF-8 BOM, comma-delimited, CRLF line endings and a trailing newline. */
export function buildUsersCsv(users: readonly User[]) {
  return BOM + [CSV_HEADER.join(','), ...users.map(row)].join(EOL) + EOL
}

/** `users-YYYY-MM-DD.csv` for the local date, not the UTC one. */
export function usersCsvFilename(now: Date = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `users-${year}-${month}-${day}.csv`
}
