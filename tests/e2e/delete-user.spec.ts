import { expect, test } from '@playwright/test'

test('F5: delete a user from the list', async ({ page }) => {
  await page.goto('/users')
  await page.getByRole('button', { name: 'Delete Ben Wright' }).click()

  const dialog = page.getByRole('alertdialog', { name: 'Delete Ben Wright?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete' }).click()

  await expect(page.getByRole('status')).toContainText('User deleted')
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('of 24')
  await expect(page.getByRole('rowheader', { name: 'Ben Wright' })).toHaveCount(0)
})

test('F5: delete from the detail page returns to the filtered list', async ({ page }) => {
  await page.goto('/users?role=admin')
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('of 5')
  await page.getByRole('link', { name: 'View Grace Taylor' }).click()
  await expect(page.getByRole('heading', { name: 'Grace Taylor' })).toBeVisible()

  await page.getByRole('button', { name: 'Delete Grace Taylor' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()

  await expect(page).toHaveURL(/\/users\?role=admin$/)
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('of 4')
  await expect(page.getByRole('combobox', { name: 'Role' })).toHaveValue('admin')
})
