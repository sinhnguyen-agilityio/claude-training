import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { User } from '@/features/users/schema'
import { server } from '@/mocks/node'
import { seedUsers } from '@/mocks/seed'
import { renderRoute } from '@/test/renderWithProviders'

async function createUser(): Promise<User> {
  const response = await fetch(new URL('/api/users', location.origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Zoe',
      lastName: 'Adams',
      email: 'zoe@x.co',
      role: 'viewer',
    }),
  })
  return (await response.json()) as User
}

async function confirmReset(user: ReturnType<typeof renderRoute>['user']) {
  await user.click(screen.getByRole('button', { name: 'Reset demo data' }))
  const dialog = screen.getByRole('alertdialog', { name: 'Reset demo data?' })
  await user.click(within(dialog).getByRole('button', { name: 'Reset' }))
}

describe('Reset demo data', () => {
  it('asks first; Cancel changes nothing', async () => {
    await createUser()
    const { user } = renderRoute('/users')
    expect(await screen.findByText('Showing 1–10 of 26')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset demo data' }))
    expect(
      screen.getByRole('alertdialog', { name: 'Reset demo data?' }),
    ).toHaveAccessibleDescription(/restored to the original 25/)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1–10 of 26')).toBeInTheDocument()
  })

  it('restores the seed data, toasts and goes to the unfiltered list', async () => {
    await createUser()
    const { user, router } = renderRoute('/users?role=viewer&page=2')
    await screen.findByRole('table', { name: 'Users' })

    await confirmReset(user)

    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(router.state.location.pathname).toBe('/users')
    expect(await screen.findByText('Showing 1–10 of 25')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Notifications' })).toHaveTextContent(
      'Demo data reset',
    )
  })

  it('from a deleted-by-reset user page, lands on the list without "User not found"', async () => {
    const zoe = await createUser()
    const { user, router } = renderRoute(`/users/${zoe.id}`)
    await screen.findByRole('heading', { name: 'Zoe Adams' })

    await confirmReset(user)

    await waitFor(() => expect(router.state.location.pathname).toBe('/users'))
    expect(screen.queryByText('User not found')).not.toBeInTheDocument()
    expect(await screen.findByText('Showing 1–10 of 25')).toBeInTheDocument()
  })

  it('from an edit page with unsaved changes, does not ask again', async () => {
    const anna = seedUsers[0]!
    const { user, router } = renderRoute(`/users/${anna.id}/edit`)
    await screen.findByRole('heading', { name: 'Edit Anna Kowalski' })
    await user.type(screen.getByLabelText(/First name/), 'x')

    await confirmReset(user)

    await waitFor(() => expect(router.state.location.pathname).toBe('/users'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('shows an error toast when the reset fails', async () => {
    server.use(
      http.post('/api/reset', () => HttpResponse.json({ message: 'Nope' }, { status: 500 })),
    )
    const { user, router } = renderRoute('/users?page=2')
    await screen.findByRole('table', { name: 'Users' })

    await confirmReset(user)

    expect(await screen.findByText('Could not reset demo data: Nope')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?page=2')
  })
})
