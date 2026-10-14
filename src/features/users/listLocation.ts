/**
 * Remembers the list's last query string (search, filters, sort, page) for this tab, so pages
 * that lead back to the list can restore it (SPEC F5). Storage can be unavailable (private mode,
 * blocked site data); then the plain list is used.
 */
const KEY = 'user-management:last-list-search'

export function rememberListSearch(search: string) {
  try {
    sessionStorage.setItem(KEY, search)
  } catch {
    // Ignore: falls back to the plain list.
  }
}

/** `/users` plus the last-used query string, if any. */
export function lastListPath() {
  try {
    return `/users${sessionStorage.getItem(KEY) ?? ''}`
  } catch {
    return '/users'
  }
}
