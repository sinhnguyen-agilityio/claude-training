import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from '@/features/users/components/Pagination'
import { lastPageOf } from '@/features/users/query'

describe('Pagination', () => {
  it('shows the range and moves between pages', async () => {
    const onPageChange = vi.fn()
    render(<Pagination page={2} pageSize={10} total={25} onPageChange={onPageChange} />)

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent(
      'Showing 11–20 of 25',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPageChange.mock.calls).toEqual([[1], [3]])
  })

  it('handles an empty result', () => {
    render(<Pagination page={1} pageSize={10} total={0} onPageChange={() => {}} />)

    expect(screen.getByText('Showing 0–0 of 0')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })
})

describe('lastPageOf', () => {
  it.each([
    [0, 1],
    [10, 1],
    [11, 2],
    [25, 3],
  ])('%i users -> %i pages', (total, pages) => {
    expect(lastPageOf(total, 10)).toBe(pages)
  })
})
