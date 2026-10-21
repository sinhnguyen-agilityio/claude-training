import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime } from '@/shared/lib/format'

describe('format', () => {
  // Midday UTC is the same calendar day in every timezone the tests may run in.
  const iso = '2026-10-14T12:00:00.000Z'

  it('formats a date as "Mon D, YYYY"', () => {
    expect(formatDate(iso)).toBe('Oct 14, 2026')
  })

  it('formats a date-time with the local time', () => {
    expect(formatDateTime(iso)).toMatch(/^Oct 14, 2026, \d{1,2}:\d{2}\s?[AP]M$/)
  })
})
