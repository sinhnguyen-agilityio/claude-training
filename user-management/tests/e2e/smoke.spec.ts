import { expect, test } from '@playwright/test'

test('app loads and redirects to the users page', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/users$/)
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  await expect(page).toHaveTitle('User Management Dashboard')
})

test('the mock API is served by the production build', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()

  const body = await page.evaluate(async () => {
    const response = await fetch('/api/users')
    return { status: response.status, json: await response.json() }
  })

  expect(body.status).toBe(200)
  expect(body.json).toMatchObject({ total: 25, page: 1, pageSize: 10 })
})
