import { expect, test } from '@playwright/test'

test('F2: create a user and see it first in the list', async ({ page }) => {
  await page.goto('/users')
  await page.getByRole('link', { name: 'Add user' }).click()
  await expect(page).toHaveURL(/\/users\/new$/)

  await page.getByLabel('First name').fill('Zoe')
  await page.getByLabel('Last name').fill('Adams')
  await page.getByLabel('Email').fill('Zoe.Adams@Example.com')
  await page.getByLabel('Role').selectOption('editor')
  await page.getByRole('button', { name: 'Create user' }).click()

  await expect(page.getByRole('status', { name: 'Notifications' })).toContainText('User created')
  await expect(page).toHaveURL(/\/users$/)
  const firstRow = page.getByRole('row').nth(1)
  await expect(firstRow.getByRole('rowheader')).toHaveText('Zoe Adams')
  await expect(firstRow).toContainText('zoe.adams@example.com')
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('of 26')
})

test('F2: a duplicate email shows an inline error and keeps the input', async ({ page }) => {
  await page.goto('/users/new')

  await page.getByLabel('First name').fill('Anna')
  await page.getByLabel('Last name').fill('Copy')
  await page.getByLabel('Email').fill('anna.kowalski@example.com')
  await page.getByLabel('Role').selectOption('viewer')
  await page.getByRole('button', { name: 'Create user' }).click()

  await expect(page.getByText('Email is already in use')).toBeVisible()
  await expect(page.getByLabel('Email')).toHaveValue('anna.kowalski@example.com')
  await expect(page.getByLabel('Last name')).toHaveValue('Copy')
  await expect(page).toHaveURL(/\/users\/new$/)
})
