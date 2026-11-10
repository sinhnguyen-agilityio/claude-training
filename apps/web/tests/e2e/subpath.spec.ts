import { expect, test } from './fixtures.js'

// GitHub Pages serves the app under /claude-training/. These tests run only against a build with
// BASE_PATH set (the CI step after `pnpm e2e`). playwright.config.ts appends BASE_PATH to baseURL, so
// every path here is relative: an absolute '/users' would leave the base path.
test.skip(!process.env.BASE_PATH, 'needs a BASE_PATH build')

const BEN_WRIGHT_ID = '00000000-0000-4000-8000-000000000025'

test('opens the users list under the base path', async ({ page }) => {
  await page.goto('./')

  await expect(page).toHaveURL(/\/claude-training\/users$/)
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  await expect(page.getByRole('row').nth(1).getByRole('rowheader')).toHaveText('Ben Wright')
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('of 25')
})

test("a user's detail page survives a reload", async ({ page }) => {
  await page.goto('./')
  await page.getByRole('link', { name: 'View Ben Wright' }).click()

  const detailUrl = new RegExp(`/claude-training/users/${BEN_WRIGHT_ID}$`)
  await expect(page).toHaveURL(detailUrl)
  await expect(page.getByRole('heading', { name: 'Ben Wright' })).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(detailUrl)
  await expect(page.getByRole('heading', { name: 'Ben Wright' })).toBeVisible()
})

test('a created user persists across a reload', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('link', { name: 'Add user' }).click()
  await expect(page).toHaveURL(/\/claude-training\/users\/new$/)

  await page.getByLabel('First name').fill('Zoe')
  await page.getByLabel('Last name').fill('Adams')
  await page.getByLabel('Email').fill('zoe.adams@example.com')
  await page.getByLabel('Role').selectOption('editor')
  await page.getByRole('button', { name: 'Create user' }).click()

  await expect(page.getByRole('status', { name: 'Notifications' })).toContainText('User created')
  await expect(page).toHaveURL(/\/claude-training\/users$/)
  const firstRowHeader = page.getByRole('row').nth(1).getByRole('rowheader')
  await expect(firstRowHeader).toHaveText('Zoe Adams')

  await page.reload()
  await expect(firstRowHeader).toHaveText('Zoe Adams')
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('of 26')
})

test('under the base path the app still calls /api at the root and registers no worker', async ({
  page,
}) => {
  const listResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/users',
  )
  await page.goto('./')
  const response = await listResponse

  expect(response.status()).toBe(200)
  expect(response.fromServiceWorker()).toBe(false)
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  const registrations = await page.evaluate(
    async () => (await navigator.serviceWorker.getRegistrations()).length,
  )
  expect(registrations).toBe(0)
})
