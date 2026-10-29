import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/renderWithProviders'

describe('routes', () => {
  it('redirects / to the users page', async () => {
    const { router } = renderRoute('/')

    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/users')
  })

  it('shows a not-found page for unknown paths', async () => {
    const { user, router } = renderRoute('/does-not-exist')

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Back to users' }))
    expect(router.state.location.pathname).toBe('/users')
  })
})
