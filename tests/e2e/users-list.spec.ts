import { expect, test } from '@playwright/test'

// Each test gets a fresh browser context, so localStorage (and the mock data) starts from the seed.

test('F1: page through the user list and keep the page on reload', async ({ page }) => {
  await page.goto('/users')
  const pagination = page.getByRole('navigation', { name: 'Pagination' })
  await expect(pagination).toContainText('Showing 1–10 of 25')
  await expect(page.getByRole('row')).toHaveCount(11)

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(pagination).toContainText('Showing 11–20 of 25')
  await expect(page).toHaveURL(/\?page=2$/)

  await page.reload()
  await expect(pagination).toContainText('Showing 11–20 of 25')

  await page.getByRole('button', { name: 'Previous' }).click()
  await expect(pagination).toContainText('Showing 1–10 of 25')
  await expect(page).toHaveURL(/\/users$/)
})

test('F1: the table scrolls inside its container on a 375 px screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/users')
  await expect(page.getByRole('table', { name: 'Users' })).toBeVisible()

  const pageScrolls = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(pageScrolls).toBe(false)
})
