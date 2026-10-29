import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog, type ConfirmDialogProps } from '@/shared/ui/ConfirmDialog'

function Harness(props: Partial<ConfirmDialogProps>) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Delete user</button>
      <ConfirmDialog
        open={open}
        title="Delete Jane Doe?"
        description="This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        {...props}
      />
    </>
  )
}

async function openDialog(props: Partial<ConfirmDialogProps> = {}) {
  const user = userEvent.setup()
  render(<Harness {...props} />)
  await user.click(screen.getByRole('button', { name: 'Delete user' }))
  return { user, dialog: screen.getByRole('alertdialog', { name: 'Delete Jane Doe?' }) }
}

describe('ConfirmDialog', () => {
  it('renders nothing while closed', () => {
    render(<Harness />)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('has an accessible name and description, and focuses Cancel', async () => {
    const { dialog } = await openDialog()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.')
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('keeps Tab inside the dialog, in both directions', async () => {
    const { user } = await openDialog()
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    const confirm = screen.getByRole('button', { name: 'Delete' })

    await user.tab()
    expect(confirm).toHaveFocus()
    await user.tab()
    expect(cancel).toHaveFocus()
    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()
  })

  it('cancels on Escape', async () => {
    const onCancel = vi.fn()
    const { user } = await openDialog({ onCancel })

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('returns focus to the opener after closing', async () => {
    const { user } = await openDialog()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete user' })).toHaveFocus()
  })

  it('calls onConfirm', async () => {
    const onConfirm = vi.fn()
    const { user } = await openDialog({ onConfirm })

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('disables both buttons and ignores Escape while pending', async () => {
    const onCancel = vi.fn()
    const { user } = await openDialog({ pending: true, onCancel })

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('does not move focus out when nothing inside is focusable', async () => {
    const { user, dialog } = await openDialog({ pending: true })
    dialog.focus()

    await user.tab()
    expect(dialog).toHaveFocus()
  })
})
