import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'

describe('App', () => {
  it('renders the app shell with the router and query client', async () => {
    render(<App />)

    expect(screen.getByRole('link', { name: 'User Management' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument()
  })
})
