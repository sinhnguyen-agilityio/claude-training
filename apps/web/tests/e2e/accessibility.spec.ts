import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const ANNA_ID = '00000000-0000-4000-8000-000000000001'

/** Fails on serious or critical WCAG 2.x A/AA violations, listing what failed. */
async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const serious = violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(', ')}`)
  expect(serious).toEqual([])
}

const pages: Array<{ name: string; path: string; ready: (page: Page) => Promise<void> }> = [
  {
    name: 'users list',
    path: '/users',
    ready: (page) => expect(page.getByRole('table', { name: 'Users' })).toBeVisible(),
  },
  {
    name: 'empty list',
    path: '/users?q=no-such-user',
    ready: (page) => expect(page.getByText('No users match your filters')).toBeVisible(),
  },
  {
    name: 'create user',
    path: '/users/new',
    ready: (page) => expect(page.getByRole('heading', { name: 'Add user' })).toBeVisible(),
  },
  {
    name: 'user detail',
    path: `/users/${ANNA_ID}`,
    ready: (page) => expect(page.getByRole('heading', { name: 'Anna Kowalski' })).toBeVisible(),
  },
  {
    name: 'edit user',
    path: `/users/${ANNA_ID}/edit`,
    ready: (page) =>
      expect(page.getByRole('heading', { name: 'Edit Anna Kowalski' })).toBeVisible(),
  },
  {
    name: 'user not found',
    path: '/users/missing',
    ready: (page) => expect(page.getByRole('heading', { name: 'User not found' })).toBeVisible(),
  },
  {
    name: 'page not found',
    path: '/nope',
    ready: (page) => expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible(),
  },
]

for (const { name, path, ready } of pages) {
  test(`a11y: ${name} has no serious violations`, async ({ page }) => {
    await page.goto(path)
    await ready(page)
    await expectNoSeriousViolations(page)
  })

  test(`responsive: ${name} does not scroll sideways at 375 px`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(path)
    await ready(page)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
  })
}

test('a11y: form errors and dialogs have no serious violations', async ({ page }) => {
  await page.goto('/users/new')
  await page.getByRole('button', { name: 'Create user' }).click()
  await expect(page.getByText('First name is required')).toBeVisible()
  await expectNoSeriousViolations(page)

  await page.goto('/users')
  await page.getByRole('button', { name: 'Delete Ben Wright' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await expectNoSeriousViolations(page)
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Reset demo data' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await expectNoSeriousViolations(page)
})

test('a11y: selected rows, the action bar and the bulk dialog have no serious violations', async ({
  page,
}) => {
  await page.goto('/users')
  await page.getByRole('checkbox', { name: 'Select Ben Wright' }).check()
  await page.getByRole('checkbox', { name: 'Select Grace Taylor' }).check()
  await expect(page.getByText('2 selected')).toBeVisible()
  await expectNoSeriousViolations(page)

  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('alertdialog', { name: 'Delete 2 users?' })).toBeVisible()
  await expectNoSeriousViolations(page)
})

test('responsive: the bulk action bar wraps and the header stays visible at 375 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/users')
  await page.getByRole('checkbox', { name: 'Select Ben Wright' }).check()

  const buttons = ['Set active', 'Set inactive', 'Delete', 'Clear selection'].map((name) =>
    page.getByRole('button', { name, exact: true }),
  )
  const tops = new Set<number>()
  for (const button of buttons) {
    await expect(button).toBeVisible()
    const box = await button.boundingBox()
    expect(box!.x + box!.width).toBeLessThanOrEqual(375)
    tops.add(Math.round(box!.y))
  }
  expect(tops.size).toBeGreaterThanOrEqual(2)

  await expect(page.getByRole('checkbox', { name: 'Select all users on this page' })).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
})

test('keyboard: create a user and delete it without a mouse', async ({ page }) => {
  await page.goto('/users')
  await expect(page.getByRole('table', { name: 'Users' })).toBeVisible()

  const addUser = page.getByRole('link', { name: 'Add user' })
  await addUser.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Add user' })).toBeVisible()

  await page.getByLabel('First name').focus()
  await page.keyboard.type('Kim')
  await page.keyboard.press('Tab')
  await page.keyboard.type('Keyboard')
  await page.keyboard.press('Tab')
  await page.keyboard.type('kim@example.com')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab') // skip the optional phone
  await page.keyboard.press('ArrowDown') // Role: "Choose a role" -> Admin
  await page.keyboard.press('Tab') // Status (keeps Active)
  await page.keyboard.press('Tab') // Cancel
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Create user' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/users$/)
  await expect(page.getByRole('rowheader', { name: 'Kim Keyboard' })).toBeVisible()

  await page.getByRole('button', { name: 'Delete Kim Keyboard' }).focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('alertdialog', { name: 'Delete Kim Keyboard?' })
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Delete' })).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('rowheader', { name: 'Kim Keyboard' })).toHaveCount(0)
})
