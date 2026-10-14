import { expect, test } from '@playwright/test'

test('F4: edit a user and see the change on the detail page', async ({ page }) => {
  await page.goto('/users')
  await page.getByRole('link', { name: 'Edit Ben Wright' }).click()
  await expect(page.getByRole('heading', { name: 'Edit Ben Wright' })).toBeVisible()

  const save = page.getByRole('button', { name: 'Save changes' })
  await expect(save).toBeDisabled()
  await page.getByLabel('Status').selectOption('active')
  await page.getByLabel('Phone').fill('+1 555 0199')
  await save.click()

  await expect(page.getByRole('status')).toContainText('User updated')
  await expect(page.getByRole('heading', { name: 'Ben Wright' })).toBeVisible()
  await expect(page.getByText('+1 555 0199')).toBeVisible()
  await expect(page.getByText('Active', { exact: true })).toBeVisible()
})

test('F4: leaving with unsaved changes asks first; Stay keeps the input', async ({ page }) => {
  await page.goto('/users')
  await page.getByRole('link', { name: 'Edit Ben Wright' }).click()
  await page.getByLabel('First name').fill('Benjamin')

  await page.getByRole('link', { name: 'User Management' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Discard unsaved changes?' })
  await expect(dialog).toBeVisible()

  await dialog.getByRole('button', { name: 'Stay' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByLabel('First name')).toHaveValue('Benjamin')
  await expect(page).toHaveURL(/\/edit$/)
})
