import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '@/shared/ui/Button'
import { EmptyState, ErrorState, TableSkeleton } from '@/shared/ui/states'

describe('TableSkeleton', () => {
  it('is announced once and renders rows x columns placeholders', () => {
    const { container } = render(<TableSkeleton rows={3} columns={2} label="Loading users" />)
    expect(screen.getByRole('status', { name: 'Loading users' })).toBeInTheDocument()
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(6)
  })
})

describe('EmptyState', () => {
  it('shows a title, description and action', () => {
    render(
      <EmptyState
        title="No users match your filters"
        description="Try another search."
        action={<Button>Clear filters</Button>}
      />,
    )
    expect(screen.getByText('No users match your filters')).toBeInTheDocument()
    expect(screen.getByText('Try another search.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('can render the title as a heading', () => {
    render(<EmptyState title="User not found" titleAs="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'User not found' })).toBeInTheDocument()
  })

  it('works with a title only', () => {
    render(<EmptyState title="Nothing here" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('is an alert with a default title and a retry button', async () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Network error" onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('alert')).toHaveTextContent('Network error')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('disables retry while retrying', () => {
    render(<ErrorState title="Could not load users" onRetry={() => {}} retrying />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load users')
    expect(screen.getByRole('button', { name: 'Retrying…' })).toBeDisabled()
  })

  it('can omit the retry button', () => {
    render(<ErrorState />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('Button', () => {
  it('defaults to type="button"', () => {
    render(<Button variant="ghost">Close</Button>)
    expect(screen.getByRole('button', { name: 'Close' })).toHaveAttribute('type', 'button')
  })
})
