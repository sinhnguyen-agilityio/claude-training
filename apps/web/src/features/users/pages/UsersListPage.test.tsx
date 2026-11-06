import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/renderWithProviders'

function bodyRows() {
  // The first row is the header.
  return screen.getAllByRole('row').slice(1)
}

async function waitForTable() {
  return screen.findByRole('table', { name: 'Users' })
}

describe('UsersListPage', () => {
  it('shows a skeleton, then the first 10 users, newest first', async () => {
    renderRoute('/users')

    expect(screen.getByRole('status', { name: 'Loading users' })).toBeInTheDocument()
    await waitForTable()

    expect(bodyRows()).toHaveLength(10)
    expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()

    const first = within(bodyRows()[0]!)
    expect(first.getByRole('rowheader')).toHaveTextContent('Ben Wright')
    expect(first.getByText('ben.wright@example.com')).toBeInTheDocument()
    expect(first.getByText('Viewer')).toBeInTheDocument()
    expect(first.getByText('Inactive')).toBeInTheDocument()
    expect(first.getByText('Jan 25, 2026')).toHaveAttribute('datetime', '2026-01-25T09:00:00.000Z')
  })

  it('links each row to the view and edit pages', async () => {
    renderRoute('/users')
    await waitForTable()

    expect(screen.getByRole('link', { name: 'View Ben Wright' })).toHaveAttribute(
      'href',
      '/users/00000000-0000-4000-8000-000000000025',
    )
    expect(screen.getByRole('link', { name: 'Edit Ben Wright' })).toHaveAttribute(
      'href',
      '/users/00000000-0000-4000-8000-000000000025/edit',
    )
  })

  it('pages forward and back, keeping the page in the URL', async () => {
    const { user, router } = renderRoute('/users')
    await waitForTable()
    const previous = screen.getByRole('button', { name: 'Previous' })
    const next = screen.getByRole('button', { name: 'Next' })
    expect(previous).toBeDisabled()

    await user.click(next)
    expect(await screen.findByText('Showing 11–20 of 25')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?page=2')

    await user.click(next)
    expect(await screen.findByText('Showing 21–25 of 25')).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(5)
    expect(next).toBeDisabled()

    await user.click(previous)
    await user.click(previous)
    expect(await screen.findByText('Showing 1–10 of 25')).toBeInTheDocument()
    expect(router.state.location.search).toBe('')
  })

  it('restores the page from the URL', async () => {
    renderRoute('/users?page=2')
    expect(await screen.findByText('Showing 11–20 of 25')).toBeInTheDocument()
  })

  it('replaces a page past the end with the last page', async () => {
    const { router } = renderRoute('/users?page=99')

    expect(await screen.findByText('Showing 21–25 of 25')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?page=3')
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('treats an invalid page as page 1', async () => {
    renderRoute('/users?page=abc')
    expect(await screen.findByText('Showing 1–10 of 25')).toBeInTheDocument()
  })
})
