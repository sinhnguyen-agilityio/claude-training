import { expect, test } from '@playwright/test'

test('F3: open a user from the list', async ({ page }) => {
  await page.goto('/users')
  await page.getByRole('link', { name: 'View Ben Wright' }).click()

  await expect(page.getByRole('heading', { name: 'Ben Wright' })).toBeVisible()
  await expect(page.getByText('ben.wright@example.com')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible()
})

test('F3: an unknown id shows "User not found" with a link back', async ({ page }) => {
  await page.goto('/users/does-not-exist')

  await expect(page.getByRole('heading', { name: 'User not found' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to users' }).click()
  await expect(page).toHaveURL(/\/users$/)
  await expect(page.getByRole('table', { name: 'Users' })).toBeVisible()
})
