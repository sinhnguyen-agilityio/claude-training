import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { renderRoute } from '@/test/renderWithProviders'

function rowNames() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getByRole('rowheader').textContent)
}

/** Records the query string of every GET /api/users request. */
function recordListRequests() {
  const searches: string[] = []
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/api/users') searches.push(url.search)
  })
  return searches
}

afterEach(() => {
  server.events.removeAllListeners()
})

async function renderList(path = '/users') {
  const result = renderRoute(path)
  await screen.findByRole('table', { name: 'Users' })
  return result
}

describe('UsersListPage search, filters and sort', () => {
  it('searches first name, last name or email after a pause, with one request', async () => {
    const { user, router } = await renderList()
    const searches = recordListRequests()

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'NGUYEN')

    await waitFor(() => expect(screen.getByText('Showing 1–2 of 2')).toBeInTheDocument())
    expect(rowNames()).toEqual(['Lan Nguyen', 'Minh Nguyen'])
    expect(searches).toEqual(['?q=NGUYEN&sort=createdAt&order=desc&page=1'])
    expect(router.state.location.search).toBe('?q=NGUYEN')
  })

  it('filters by role and status', async () => {
    const { user, router } = await renderList()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Role' }), 'admin')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'inactive')

    await waitFor(() => expect(rowNames()).toEqual(['Kenji Tanaka']))
    expect(router.state.location.search).toBe('?role=admin&status=inactive')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Role' }), '')
    await waitFor(() => expect(screen.getByText('Showing 1–6 of 6')).toBeInTheDocument())
    expect(router.state.location.search).toBe('?status=inactive')
  })

  it('sorts by name or created date, newest first by default', async () => {
    const { user, router } = await renderList()
    const sortBy = screen.getByRole('combobox', { name: 'Sort by' })
    expect(sortBy).toHaveDisplayValue('Newest first')
    expect(rowNames()[0]).toBe('Ben Wright')

    await user.selectOptions(sortBy, 'Name A–Z')
    await waitFor(() => expect(rowNames()[0]).toBe('Oscar Andersson'))
    expect(router.state.location.search).toBe('?sort=name&order=asc')

    await user.selectOptions(sortBy, 'Name Z–A')
    await waitFor(() => expect(rowNames()[0]).toBe('Ben Wright'))

    await user.selectOptions(sortBy, 'Oldest first')
    await waitFor(() => expect(rowNames()[0]).toBe('Anna Kowalski'))
    // Default values (sort=createdAt) are left out of the URL.
    expect(router.state.location.search).toBe('?order=asc')
  })

  it('resets to page 1 when search, a filter or the sort changes', async () => {
    const { user, router } = await renderList('/users?page=2')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'active')
    await waitFor(() => expect(router.state.location.search).toBe('?status=active'))
  })

  it('restores the whole view from the URL', async () => {
    await renderList('/users?q=ann&role=admin&sort=name&order=asc')

    await waitFor(() => expect(rowNames()).toEqual(['Anna Kowalski', 'Hannah Lee']))
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('ann')
    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveDisplayValue('Admin')
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveDisplayValue('All statuses')
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveDisplayValue('Name A–Z')
  })

  it('ignores invalid values in the URL', async () => {
    await renderList('/users?role=owner&status=x&sort=email&order=up')

    expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveDisplayValue('All roles')
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveDisplayValue('Newest first')
  })

  it('follows the URL when it changes from outside, e.g. Back', async () => {
    const { user, router } = await renderList()
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'lee')
    await waitFor(() => expect(router.state.location.search).toBe('?q=lee'))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Role' }), 'admin')
    await waitFor(() => expect(router.state.location.search).toBe('?q=lee&role=admin'))

    await router.navigate('/users')
    await waitFor(() => expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue(''))
    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveDisplayValue('All roles')
  })
})
