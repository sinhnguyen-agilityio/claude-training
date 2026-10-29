import { expect, test } from '@playwright/test'

const GRACE_ID = '00000000-0000-4000-8000-000000000024'

test('F7: select users, change their status, then delete them', async ({ page }) => {
  await page.goto('/users')
  await expect(page.getByRole('table', { name: 'Users' })).toBeVisible()
  const toast = page.getByRole('status', { name: 'Notifications' })
  const header = page.getByRole('checkbox', { name: 'Select all users on this page' })

  // Newest first: Ben Wright (inactive), Grace Taylor and Oscar Andersson (active).
  await expect(page.getByText('selected')).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Select Ben Wright' }).check()
  await page.getByRole('checkbox', { name: 'Select Grace Taylor' }).check()
  await page.getByRole('checkbox', { name: 'Select Oscar Andersson' }).check()
  await expect(page.getByText('3 selected')).toBeVisible()
  expect(await header.evaluate((input: HTMLInputElement) => input.indeterminate)).toBe(true)

  // Status changes need no confirmation, and apply to users who already have the status.
  await page.getByRole('button', { name: 'Set inactive' }).click()
  await expect(toast).toContainText('3 users updated')
  await expect(page.getByText('selected')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeFocused()
  const graceRow = page.getByRole('row', { name: /Grace Taylor/ })
  await expect(graceRow).toContainText('Inactive')

  // Delete asks first, and Cancel keeps the selection.
  await page.getByRole('checkbox', { name: 'Select Grace Taylor' }).check()
  await page.getByRole('checkbox', { name: 'Select Oscar Andersson' }).check()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Delete 2 users?' })
  await expect(dialog).toContainText('This permanently deletes 2 users and cannot be undone.')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('2 selected')).toBeVisible()

  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(toast).toContainText('2 users deleted')
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('of 23')
  await expect(page.getByRole('rowheader', { name: 'Grace Taylor' })).toHaveCount(0)
  await expect(page.getByText('selected')).toHaveCount(0)
})

test('F7: a partial failure warns and drops rows that are gone', async ({ page }) => {
  await page.goto('/users')
  await expect(page.getByRole('table', { name: 'Users' })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Select Ben Wright' }).check()
  await page.getByRole('checkbox', { name: 'Select Grace Taylor' }).check()

  // Someone else deletes Grace after the selection was made, so her id comes back as not_found.
  const status = await page.evaluate(
    async (id) => (await fetch(`/api/users/${id}`, { method: 'DELETE' })).status,
    GRACE_ID,
  )
  expect(status).toBe(204)

  await page.getByRole('button', { name: 'Set active' }).click()

  await expect(page.getByRole('status', { name: 'Notifications' })).toContainText(
    '1 of 2 updated, 1 failed',
  )
  await expect(page.getByRole('rowheader', { name: 'Grace Taylor' })).toHaveCount(0)
  await expect(page.getByText('selected')).toHaveCount(0)
})
