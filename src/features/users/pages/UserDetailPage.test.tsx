import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { seedUsers } from '@/mocks/seed'
import { formatDateTime } from '@/shared/lib/format'
import { renderRoute } from '@/test/renderWithProviders'

const anna = seedUsers[0]!
const lan = seedUsers[2]!

/** The <dd> value for a <dt> label. */
function valueOf(label: string) {
  return screen.getByText(label, { selector: 'dt' }).nextElementSibling
}

describe('UserDetailPage', () => {
  it('shows a skeleton, then every field', async () => {
    renderRoute(`/users/${anna.id}`)

    expect(screen.getByRole('status', { name: 'Loading user' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Anna Kowalski' })).toBeInTheDocument()

    expect(valueOf('First name')).toHaveTextContent('Anna')
    expect(valueOf('Last name')).toHaveTextContent('Kowalski')
    expect(screen.getByRole('link', { name: anna.email })).toHaveAttribute(
      'href',
      `mailto:${anna.email}`,
    )
    expect(valueOf('Phone')).toHaveTextContent('+48 22 123 4567')
    expect(valueOf('Role')).toHaveTextContent('Admin')
    expect(valueOf('Status')).toHaveTextContent('Active')
    expect(valueOf('Created')).toHaveTextContent(formatDateTime(anna.createdAt))
    expect(valueOf('Updated')).toHaveTextContent(formatDateTime(anna.updatedAt))
  })

  it('shows a dash for a missing phone', async () => {
    renderRoute(`/users/${lan.id}`)
    await screen.findByRole('heading', { name: 'Lan Nguyen' })
    expect(valueOf('Phone')).toHaveTextContent('—')
  })

  it('links to the edit page and back to the list', async () => {
    const { user, router } = renderRoute(`/users/${anna.id}`)
    await screen.findByRole('heading', { name: 'Anna Kowalski' })

    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      `/users/${anna.id}/edit`,
    )
    await user.click(screen.getByRole('link', { name: '← Back to users' }))
    expect(router.state.location.pathname).toBe('/users')
  })

  it('is reached from the list', async () => {
    const { user, router } = renderRoute('/users')
    await user.click(await screen.findByRole('link', { name: 'View Ben Wright' }))

    expect(await screen.findByRole('heading', { name: 'Ben Wright' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/users/${seedUsers[24]!.id}`)
  })

  it('shows "User not found" for an unknown id, with a link back', async () => {
    const { user, router } = renderRoute('/users/missing')

    expect(await screen.findByRole('heading', { name: 'User not found' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Back to users' }))
    expect(router.state.location.pathname).toBe('/users')
  })

  it('shows an error with Retry for other failures', async () => {
    server.use(
      http.get('/api/users/:id', () =>
        HttpResponse.json({ message: 'Server down' }, { status: 500 }),
      ),
    )
    const { user } = renderRoute(`/users/${anna.id}`)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load user')
    server.resetHandlers()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: 'Anna Kowalski' })).toBeInTheDocument()
  })
})
