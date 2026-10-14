import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/shared/ui/ToastProvider'
import { TOAST_DURATION_MS, useToast } from '@/shared/ui/useToast'

function Trigger() {
  const { showToast } = useToast()
  return (
    <>
      <button onClick={() => showToast('User created')}>Success</button>
      <button onClick={() => showToast('Could not delete', 'error')}>Failure</button>
    </>
  )
}

function renderToasts() {
  const user = userEvent.setup()
  render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  )
  return { user, region: screen.getByRole('status') }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('toasts', () => {
  it('announces messages in a polite live region', async () => {
    const { user, region } = renderToasts()

    await user.click(screen.getByRole('button', { name: 'Success' }))
    await user.click(screen.getByRole('button', { name: 'Failure' }))

    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveTextContent('User created')
    expect(region).toHaveTextContent('Could not delete')
  })

  it('dismisses itself after the timeout', async () => {
    vi.useFakeTimers()
    const { region } = renderToasts()

    fireEvent.click(screen.getByRole('button', { name: 'Success' }))
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1))
    expect(region).toHaveTextContent('User created')
    act(() => vi.advanceTimersByTime(1))
    expect(region).not.toHaveTextContent('User created')
  })

  it('can be dismissed by hand', async () => {
    const { user, region } = renderToasts()

    await user.click(screen.getByRole('button', { name: 'Success' }))
    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }))
    expect(region).toBeEmptyDOMElement()
  })

  it('throws a clear error outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Trigger />)).toThrow('useToast must be used inside <ToastProvider>')
  })
})
