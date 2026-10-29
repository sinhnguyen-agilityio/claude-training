import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { renderRoute } from '@/test/renderWithProviders'

describe('UsersListPage states', () => {
  it('shows a skeleton while the first page loads', async () => {
    renderRoute('/users')

    expect(screen.getByRole('status', { name: 'Loading users' })).toBeInTheDocument()
    await screen.findByRole('table', { name: 'Users' })
    expect(screen.queryByRole('status', { name: 'Loading users' })).not.toBeInTheDocument()
  })

  it('shows an empty state with a Clear filters button when nothing matches', async () => {
    const { user, router } = renderRoute('/users?q=zzz&role=admin&sort=name&order=asc')

    expect(await screen.findByText('No users match your filters')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(await screen.findByRole('table', { name: 'Users' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?sort=name&order=asc')
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveDisplayValue('All roles')
  })

  it('shows a plain empty state when there are no users at all', async () => {
    server.use(
      http.get('/api/users', () =>
        HttpResponse.json({ data: [], total: 0, page: 1, pageSize: 10 }),
      ),
    )
    renderRoute('/users')

    expect(await screen.findByText('No users yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
  })

  it('shows an error with Retry, and recovers', async () => {
    server.use(
      http.get('/api/users', () =>
        HttpResponse.json({ message: 'Server exploded' }, { status: 500 }),
      ),
    )
    const { user } = renderRoute('/users')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Could not load users')
    expect(alert).toHaveTextContent('Server exploded')

    server.resetHandlers()
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('table', { name: 'Users' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})
