import { expect, test } from '@playwright/test'

test('F1: an API failure shows an error, and Retry recovers', async ({ page }) => {
  // page.route() cannot see requests answered by the MSW service worker, so fail them in the page.
  // The first load is retried once, so fail two requests to reach the error state.
  await page.addInitScript(() => {
    const originalFetch = window.fetch
    let failuresLeft = 2
    window.fetch = (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      if (url.pathname === '/api/users' && failuresLeft > 0) {
        failuresLeft -= 1
        return Promise.resolve(Response.json({ message: 'Server error' }, { status: 500 }))
      }
      return originalFetch(input, init)
    }
  })

  await page.goto('/users')
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Could not load users')

  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(page.getByRole('table', { name: 'Users' })).toBeVisible()
  await expect(alert).toHaveCount(0)
})

test('F1: a search with no match shows the empty state; Clear filters resets it', async ({
  page,
}) => {
  await page.goto('/users')
  await page.getByRole('searchbox', { name: 'Search' }).fill('no-such-user')

  await expect(page.getByText('No users match your filters')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()

  await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText(
    'Showing 1–10 of 25',
  )
  await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue('')
  await expect(page).toHaveURL(/\/users$/)
})
