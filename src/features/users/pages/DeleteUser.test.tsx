import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { lastListPath, rememberListSearch } from '@/features/users/listLocation'
import { server } from '@/mocks/node'
import { seedUsers } from '@/mocks/seed'
import { renderRoute } from '@/test/renderWithProviders'

const ben = seedUsers[24]!

function rowNames() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getByRole('rowheader').textContent)
}

describe('Delete user from the list', () => {
  it('confirms with the user named, deletes, toasts and refreshes the list', async () => {
    const { user } = renderRoute('/users')
    await screen.findByRole('table', { name: 'Users' })

    await user.click(screen.getByRole('button', { name: 'Delete Ben Wright' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Delete Ben Wright?' })
    expect(dialog).toHaveAccessibleDescription(
      'This permanently removes Ben Wright (ben.wright@example.com). This cannot be undone.',
    )

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.getByText('Showing 1–10 of 24')).toBeInTheDocument())
    expect(rowNames()).not.toContain('Ben Wright')
    expect(screen.getByRole('status', { name: 'Notifications' })).toHaveTextContent('User deleted')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('Cancel changes nothing and returns focus to the Delete button', async () => {
    const { user } = renderRoute('/users')
    await screen.findByRole('table', { name: 'Users' })
    const deleteButton = screen.getByRole('button', { name: 'Delete Ben Wright' })

    await user.click(deleteButton)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(deleteButton).toHaveFocus()
    expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument()
  })

  it('goes back one page when the last row of the last page is deleted', async () => {
    // Delete the 4 oldest users, leaving 21: page 3 then holds only Joanne Baker.
    for (const oldest of seedUsers.slice(0, 4)) {
      await fetch(new URL(`/api/users/${oldest.id}`, location.origin), { method: 'DELETE' })
    }
    const { user, router } = renderRoute('/users?page=3')
    await waitFor(() => expect(screen.getByText('Showing 21–21 of 21')).toBeInTheDocument())
    expect(rowNames()).toEqual(['Joanne Baker'])

    await user.click(screen.getByRole('button', { name: 'Delete Joanne Baker' }))
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    )

    await waitFor(() => expect(screen.getByText('Showing 11–20 of 20')).toBeInTheDocument())
    expect(router.state.location.search).toBe('?page=2')
  })

  it('shows an error toast and keeps the user when the delete fails', async () => {
    server.use(
      http.delete('/api/users/:id', () =>
        HttpResponse.json({ message: 'Locked' }, { status: 500 }),
      ),
    )
    const { user } = renderRoute('/users')
    await screen.findByRole('table', { name: 'Users' })

    await user.click(screen.getByRole('button', { name: 'Delete Ben Wright' }))
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    )

    expect(await screen.findByText('Could not delete Ben Wright: Locked')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(rowNames()).toContain('Ben Wright')
  })
})

describe('Delete user from the detail page', () => {
  it('returns to the list with the last-used filters', async () => {
    const { user, router } = renderRoute('/users?role=viewer&sort=name&order=desc')
    await screen.findByRole('table', { name: 'Users' })
    await user.click(screen.getByRole('link', { name: 'View Ben Wright' }))
    await screen.findByRole('heading', { name: 'Ben Wright' })

    await user.click(screen.getByRole('button', { name: 'Delete Ben Wright' }))
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe('/users'))
    expect(router.state.location.search).toBe('?role=viewer&sort=name&order=desc')
    expect(screen.queryByText('User not found')).not.toBeInTheDocument()
    await waitFor(() => expect(rowNames()).not.toContain('Ben Wright'))
    expect(screen.getByRole('status', { name: 'Notifications' })).toHaveTextContent('User deleted')
  })

  it('returns to the plain list when no list was visited', async () => {
    const { user, router } = renderRoute(`/users/${ben.id}`)
    await screen.findByRole('heading', { name: 'Ben Wright' })

    await user.click(screen.getByRole('button', { name: 'Delete Ben Wright' }))
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe('/users'))
    expect(router.state.location.search).toBe('')
  })
})

describe('lastListPath', () => {
  it('remembers the last list query string', () => {
    expect(lastListPath()).toBe('/users')
    rememberListSearch('?q=ann')
    expect(lastListPath()).toBe('/users?q=ann')
  })
})
