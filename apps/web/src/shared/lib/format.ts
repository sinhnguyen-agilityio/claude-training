// The UI is English-only (i18n is out of scope), so dates use a fixed en-US format in local time.
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })
const dateTimeFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })

/** "Oct 14, 2026" */
export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso))
}

/** "Oct 14, 2026, 9:00 AM" */
export function formatDateTime(iso: string) {
  return dateTimeFormat.format(new Date(iso))
}
