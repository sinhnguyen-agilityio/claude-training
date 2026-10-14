import { expect, test } from '@playwright/test'

test('app loads and redirects to the users page', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/users$/)
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  await expect(page).toHaveTitle('User Management Dashboard')
})
