import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { renderRoute } from '@/test/renderWithProviders'

function field(name: string | RegExp) {
  return screen.getByLabelText(name)
}

async function fillValidForm(
  user: ReturnType<typeof renderRoute>['user'],
  email = 'zoe@example.com',
) {
  await user.type(field(/First name/), 'Zoe')
  await user.type(field(/Last name/), 'Adams')
  await user.type(field(/Email/), email)
  await user.type(field(/Phone/), '+1 555 0100')
  await user.selectOptions(field(/Role/), 'editor')
}

describe('CreateUserPage', () => {
  it('is reached from the list via "Add user"', async () => {
    const { user, router } = renderRoute('/users')
    await user.click(screen.getByRole('link', { name: 'Add user' }))

    expect(await screen.findByRole('heading', { name: 'Add user' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/users/new')
  })

  it('shows an error only after the field is left', async () => {
    const { user } = renderRoute('/users/new')

    await user.click(field(/First name/))
    expect(screen.queryByText('First name is required')).not.toBeInTheDocument()

    await user.tab()
    expect(await screen.findByText('First name is required')).toBeInTheDocument()
    expect(field(/First name/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows every error on submit and focuses the first invalid field', async () => {
    const { user } = renderRoute('/users/new')

    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(await screen.findByText('First name is required')).toBeInTheDocument()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(field(/Role/)).toHaveAccessibleDescription('Choose a role')
    expect(field(/First name/)).toHaveFocus()
  })

  it('defaults status to Active', () => {
    renderRoute('/users/new')
    expect(field(/Status/)).toHaveDisplayValue('Active')
  })

  it('creates the user, shows a toast and returns to the list with the user first', async () => {
    const { user, router } = renderRoute('/users/new')
    await fillValidForm(user)

    await user.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/users'))
    expect(screen.getByRole('status')).toHaveTextContent('User created')
    const firstRow = (await screen.findAllByRole('row'))[1]!
    expect(within(firstRow).getByRole('rowheader')).toHaveTextContent('Zoe Adams')
    expect(within(firstRow).getByText('zoe@example.com')).toBeInTheDocument()
  })

  it('shows "Email is already in use" on the email field and keeps the input', async () => {
    const { user, router } = renderRoute('/users/new')
    await fillValidForm(user, 'ANNA.kowalski@example.com')

    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(await screen.findByText('Email is already in use')).toBeInTheDocument()
    expect(field(/Email/)).toHaveAttribute('aria-invalid', 'true')
    expect(field(/Email/)).toHaveFocus()
    expect(field(/Email/)).toHaveValue('ANNA.kowalski@example.com')
    expect(field(/First name/)).toHaveValue('Zoe')
    expect(router.state.location.pathname).toBe('/users/new')
  })

  it('maps other server field errors onto the fields', async () => {
    server.use(
      http.post('/api/users', () =>
        HttpResponse.json(
          { message: 'Validation failed', fieldErrors: { phone: 'Phone is not reachable' } },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderRoute('/users/new')
    await fillValidForm(user)

    await user.click(screen.getByRole('button', { name: 'Create user' }))
    expect(await screen.findByText('Phone is not reachable')).toBeInTheDocument()
  })

  it('shows a form-level error when the request fails for another reason', async () => {
    server.use(
      http.post('/api/users', () => HttpResponse.json({ message: 'Server down' }, { status: 500 })),
    )
    const { user } = renderRoute('/users/new')
    await fillValidForm(user)

    await user.click(screen.getByRole('button', { name: 'Create user' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Server down')
    expect(screen.getByRole('button', { name: 'Create user' })).toBeEnabled()
  })

  it('Cancel goes back to the list', async () => {
    const { user, router } = renderRoute('/users/new')
    await user.click(screen.getByRole('link', { name: 'Cancel' }))
    expect(router.state.location.pathname).toBe('/users')
  })
})
