import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { seedUsers } from '@/mocks/seed'
import { renderRoute } from '@/test/renderWithProviders'

const anna = seedUsers[0]!
const editPath = `/users/${anna.id}/edit`

async function renderEdit() {
  const result = renderRoute(editPath)
  await screen.findByRole('heading', { name: 'Edit Anna Kowalski' })
  return result
}

const saveButton = () => screen.getByRole('button', { name: 'Save changes' })

describe('EditUserPage', () => {
  it('is pre-filled, with Save disabled until something changes', async () => {
    await renderEdit()

    expect(screen.getByLabelText(/First name/)).toHaveValue('Anna')
    expect(screen.getByLabelText(/Last name/)).toHaveValue('Kowalski')
    expect(screen.getByLabelText(/Email/)).toHaveValue(anna.email)
    expect(screen.getByLabelText(/Phone/)).toHaveValue('+48 22 123 4567')
    expect(screen.getByLabelText(/Role/)).toHaveDisplayValue('Admin')
    expect(screen.getByLabelText(/Status/)).toHaveDisplayValue('Active')
    expect(saveButton()).toBeDisabled()
  })

  it('enables Save on a change and disables it again when the change is reverted', async () => {
    const { user } = await renderEdit()
    const firstName = screen.getByLabelText(/First name/)

    await user.type(firstName, 'x')
    expect(saveButton()).toBeEnabled()

    await user.type(firstName, '{Backspace}')
    expect(saveButton()).toBeDisabled()
  })

  it('saves, shows a toast and goes to the detail page without a prompt', async () => {
    const { user, router } = await renderEdit()

    await user.selectOptions(screen.getByLabelText(/Status/), 'inactive')
    await user.click(saveButton())

    expect(await screen.findByRole('heading', { name: 'Anna Kowalski' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/users/${anna.id}`)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Notifications' })).toHaveTextContent('User updated')
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it("shows the same inline error as create when the email is another user's", async () => {
    const { user, router } = await renderEdit()
    const email = screen.getByLabelText(/Email/)

    await user.clear(email)
    await user.type(email, 'minh.nguyen@example.com')
    await user.click(saveButton())

    expect(await screen.findByText('Email is already in use')).toBeInTheDocument()
    expect(email).toHaveValue('minh.nguyen@example.com')
    expect(router.state.location.pathname).toBe(editPath)
  })

  describe('unsaved changes', () => {
    it('asks before leaving; Stay keeps the page and the input', async () => {
      const { user, router } = await renderEdit()
      await user.type(screen.getByLabelText(/First name/), 'x')

      await user.click(screen.getByRole('link', { name: 'Cancel' }))
      const dialog = await screen.findByRole('alertdialog', { name: 'Discard unsaved changes?' })
      expect(dialog).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Stay' }))
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(router.state.location.pathname).toBe(editPath)
      expect(screen.getByLabelText(/First name/)).toHaveValue('Annax')
    })

    it('Leave page discards the changes and navigates', async () => {
      const { user, router } = await renderEdit()
      await user.type(screen.getByLabelText(/First name/), 'x')

      await user.click(screen.getByRole('link', { name: 'Cancel' }))
      await user.click(await screen.findByRole('button', { name: 'Leave page' }))

      await waitFor(() => expect(router.state.location.pathname).toBe(`/users/${anna.id}`))
      expect(await screen.findByRole('heading', { name: 'Anna Kowalski' })).toBeInTheDocument()
    })

    it('does not ask when nothing changed', async () => {
      const { user, router } = await renderEdit()

      await user.click(screen.getByRole('link', { name: 'Cancel' }))
      await waitFor(() => expect(router.state.location.pathname).toBe(`/users/${anna.id}`))
    })

    it('asks the browser to confirm reload or closing the tab', async () => {
      const { user } = await renderEdit()
      const unload = () => {
        const event = new Event('beforeunload', { cancelable: true })
        window.dispatchEvent(event)
        return event.defaultPrevented
      }
      expect(unload()).toBe(false)

      await user.type(screen.getByLabelText(/First name/), 'x')
      expect(unload()).toBe(true)
    })
  })

  it('shows "User not found" for an unknown id', async () => {
    renderRoute('/users/missing/edit')
    expect(await screen.findByRole('heading', { name: 'User not found' })).toBeInTheDocument()
  })

  it('shows an error with Retry when loading fails', async () => {
    server.use(
      http.get('/api/users/:id', () => HttpResponse.json({ message: 'Down' }, { status: 500 })),
    )
    const { user } = renderRoute(editPath)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load user')
    server.resetHandlers()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: 'Edit Anna Kowalski' })).toBeInTheDocument()
  })

  it('shows a skeleton while loading', () => {
    renderRoute(editPath)
    expect(screen.getByRole('status', { name: 'Loading user' })).toBeInTheDocument()
  })
})
