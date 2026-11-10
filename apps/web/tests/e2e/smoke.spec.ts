import { expect, test } from './fixtures.js'

test('app loads and redirects to the users page', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/users$/)
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  await expect(page).toHaveTitle('User Management Dashboard')
})

// AC3: the list comes from Express and Postgres, not from a service worker.
test('the real API answers /api/users and no service worker is registered', async ({
  page,
  context,
}) => {
  const listResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/users',
  )
  await page.goto('/')
  const response = await listResponse

  expect(response.status()).toBe(200)
  expect(response.fromServiceWorker()).toBe(false)
  expect(context.serviceWorkers()).toHaveLength(0)
  expect(await response.json()).toMatchObject({ total: 25, page: 1, pageSize: 10 })
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
})
