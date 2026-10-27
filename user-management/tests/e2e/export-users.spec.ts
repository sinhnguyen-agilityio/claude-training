import { readFile } from 'node:fs/promises'
import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('F8: export the filtered users and read the downloaded file', async ({ page }) => {
  await page.goto('/users?role=editor&sort=name&order=asc')
  const exportButton = page.getByRole('button', { name: 'Export CSV' })
  await expect(page.getByRole('table', { name: 'Users' })).toBeVisible()
  await expect(exportButton).not.toHaveAttribute('aria-disabled', 'true')

  const downloadPromise = page.waitForEvent('download')
  await exportButton.click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^users-\d{4}-\d{2}-\d{2}\.csv$/)
  const path = await download.path()
  const text = await readFile(path, 'utf-8')
  expect(text.charCodeAt(0)).toBe(0xfeff)
  const lines = text.slice(1).split('\r\n')
  expect(lines[0]).toBe('First name,Last name,Email,Phone,Role,Status,Created at,Updated at')
  expect(lines.at(-1)).toBe('')
  const rows = lines.slice(1, -1)
  expect(rows.length).toBeGreaterThan(0)
  expect(rows.every((row) => row.includes(',editor,'))).toBe(true)
  // Sorted by last name, ascending.
  const lastNames = rows.map((row) => row.split(',')[1]!)
  expect(lastNames).toEqual([...lastNames].sort((a, b) => a.localeCompare(b)))
})

test('F8: the disabled button explains itself and the toolbar fits at 375 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/users?q=nobody-matches-this')
  await expect(page.getByText('No users match your filters')).toBeVisible()

  const exportButton = page.getByRole('button', { name: 'Export CSV' })
  await expect(exportButton).toHaveAttribute('aria-disabled', 'true')
  await exportButton.focus()
  await expect(page.getByRole('tooltip')).toHaveText('No users to export')

  // A disabled-looking button must not react to hover like an active one.
  const background = () => exportButton.evaluate((el) => getComputedStyle(el).backgroundColor)
  const before = await background()
  await exportButton.hover()
  expect(await background()).toBe(before)

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  )
  expect(serious).toEqual([])
})
