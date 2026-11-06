import { expect, test } from '@playwright/test'

test('F6: reset demo data removes added users and restores the seed', async ({ page }) => {
  await page.goto('/users/new')
  await page.getByLabel('First name').fill('Zoe')
  await page.getByLabel('Last name').fill('Adams')
  await page.getByLabel('Email').fill('zoe@example.com')
  await page.getByLabel('Role').selectOption('viewer')
  await page.getByRole('button', { name: 'Create user' }).click()
  const pagination = page.getByRole('navigation', { name: 'Pagination' })
  await expect(pagination).toContainText('of 26')

  await page.getByRole('button', { name: 'Reset demo data' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Reset' }).click()

  await expect(page.getByRole('status', { name: 'Notifications' })).toContainText('Demo data reset')
  await expect(pagination).toContainText('Showing 1–10 of 25')
  await expect(page.getByRole('rowheader', { name: 'Zoe Adams' })).toHaveCount(0)
})
