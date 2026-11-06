import { expect, test, type Page } from '@playwright/test'

// More SPEC F2 cases for /users/new. The happy path and the duplicate email are in create-user.spec.ts.

async function fillForm(
  page: Page,
  { first = 'Zoe', last = 'Adams', email = 'zoe.adams@example.com', role = 'editor' } = {},
) {
  await page.getByLabel('First name').fill(first)
  await page.getByLabel('Last name').fill(last)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Role').selectOption(role)
}

const createButton = (page: Page) => page.getByRole('button', { name: 'Create user' })

test.beforeEach(async ({ page }) => {
  await page.goto('/users/new')
  await expect(page.getByRole('heading', { name: 'Add user' })).toBeVisible()
})

test('F2: the form shows its fields, defaults and a way out', async ({ page }) => {
  for (const label of ['First name', 'Last name', 'Email', 'Role', 'Status']) {
    await expect(page.getByLabel(label)).toBeVisible()
  }
  await expect(page.getByLabel('Phone')).toBeVisible()
  await expect(page.getByText('Optional. Digits, spaces, +, - and ()')).toBeVisible()
  await expect(page.getByLabel('Role')).toHaveValue('')
  await expect(page.getByLabel('Status')).toHaveValue('active')
  await expect(page.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/users')
})

test('F2: submitting an empty form shows every required error and focuses the first field', async ({
  page,
}) => {
  await createButton(page).click()

  await expect(page.getByText('First name is required')).toBeVisible()
  await expect(page.getByText('Last name is required')).toBeVisible()
  await expect(page.getByText('Email is required')).toBeVisible()
  await expect(page.getByLabel('Role')).toHaveAccessibleDescription('Choose a role')
  await expect(page.getByLabel('First name')).toBeFocused()
  await expect(page.getByLabel('First name')).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveURL(/\/users\/new$/)
})

test('F2: an error shows after leaving the field, not before, and clears once fixed', async ({
  page,
}) => {
  const first = page.getByLabel('First name')
  await first.focus()
  await expect(page.getByText('First name is required')).toHaveCount(0)

  await page.getByLabel('Last name').focus()
  await expect(page.getByText('First name is required')).toBeVisible()

  await first.fill('Zoe')
  await expect(page.getByText('First name is required')).toHaveCount(0)
  await expect(first).not.toHaveAttribute('aria-invalid', 'true')
})

test('F2: a name longer than 50 characters is rejected', async ({ page }) => {
  await fillForm(page, { first: 'A'.repeat(51), last: 'B'.repeat(51) })
  await createButton(page).click()

  await expect(page.getByText('First name must be at most 50 characters')).toBeVisible()
  await expect(page.getByText('Last name must be at most 50 characters')).toBeVisible()
  await expect(page).toHaveURL(/\/users\/new$/)
})

test('F2: a name of exactly 50 characters is accepted', async ({ page }) => {
  await fillForm(page, { first: 'A'.repeat(50) })
  await createButton(page).click()

  await expect(page).toHaveURL(/\/users$/)
  await expect(page.getByRole('status', { name: 'Notifications' })).toContainText('User created')
})

test('F2: an invalid email is rejected', async ({ page }) => {
  await fillForm(page, { email: 'not-an-email' })
  await createButton(page).click()

  await expect(page.getByText('Enter a valid email address')).toBeVisible()
  await expect(page.getByLabel('Email')).toHaveValue('not-an-email')
  await expect(page).toHaveURL(/\/users\/new$/)
})

for (const { phone, message } of [
  { phone: '12345', message: 'Phone must be at least 7 characters' },
  { phone: '1'.repeat(21), message: 'Phone must be at most 20 characters' },
  { phone: 'abcdefgh', message: 'Phone may only contain digits, spaces, +, - and ()' },
]) {
  test(`F2: phone "${phone}" is rejected`, async ({ page }) => {
    await fillForm(page)
    await page.getByLabel('Phone').fill(phone)
    await createButton(page).click()

    await expect(page.getByText(message)).toBeVisible()
    await expect(page).toHaveURL(/\/users\/new$/)
  })
}

test('F2: phone is optional and accepts formatting characters', async ({ page }) => {
  await fillForm(page)
  await page.getByLabel('Phone').fill('+1 (555) 010-0100')
  await createButton(page).click()

  await expect(page).toHaveURL(/\/users$/)
  await page.getByRole('link', { name: 'View Zoe Adams' }).click()
  await expect(page.getByRole('heading', { name: 'Zoe Adams' })).toBeVisible()
  await expect(page.getByText('+1 (555) 010-0100')).toBeVisible()
})

test('F2: spaces around the names are trimmed', async ({ page }) => {
  await fillForm(page, { first: '  Zoe  ', last: '  Adams  ' })
  await createButton(page).click()

  await expect(page).toHaveURL(/\/users$/)
  await expect(page.getByRole('row').nth(1).getByRole('rowheader')).toHaveText('Zoe Adams')
})

test('F2: a user created as Inactive is listed as Inactive', async ({ page }) => {
  await fillForm(page)
  await page.getByLabel('Status').selectOption('inactive')
  await createButton(page).click()

  await expect(page).toHaveURL(/\/users$/)
  await expect(page.getByRole('row').nth(1)).toContainText('Inactive')
})

test('F2: after a duplicate email error, a different email can be submitted', async ({ page }) => {
  await fillForm(page, { email: 'anna.kowalski@example.com' })
  await createButton(page).click()
  await expect(page.getByText('Email is already in use')).toBeVisible()

  await page.getByLabel('Email').fill('anna.copy@example.com')
  await createButton(page).click()

  await expect(page).toHaveURL(/\/users$/)
  await expect(page.getByRole('row').nth(1)).toContainText('anna.copy@example.com')
})

test('F2: a server error shows a form-level message and keeps the input', async ({ page }) => {
  // page.route() cannot see requests answered by the MSW service worker, so fail the request in the page.
  await page.addInitScript(() => {
    const originalFetch = window.fetch
    window.fetch = (input, init) => {
      const request = new Request(input, init)
      if (new URL(request.url).pathname === '/api/users' && request.method === 'POST') {
        return Promise.resolve(Response.json({ message: 'Server down' }, { status: 500 }))
      }
      return originalFetch(input, init)
    }
  })
  await page.reload()

  await fillForm(page)
  await createButton(page).click()

  await expect(page.getByRole('alert')).toContainText('Server down')
  await expect(page.getByLabel('Last name')).toHaveValue('Adams')
  await expect(createButton(page)).toBeEnabled()
  await expect(page).toHaveURL(/\/users\/new$/)
})

test('F2: the button is disabled while saving, so a double click creates one user', async ({
  page,
}) => {
  await fillForm(page)
  await createButton(page).dblclick()

  await expect(page).toHaveURL(/\/users$/)
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('of 26')
})

test('F2: Enter in a field submits the form', async ({ page }) => {
  await fillForm(page)
  await page.getByLabel('Email').press('Enter')

  await expect(page).toHaveURL(/\/users$/)
  await expect(page.getByRole('status', { name: 'Notifications' })).toContainText('User created')
})

test('F2: Cancel returns to the list without creating a user', async ({ page }) => {
  await fillForm(page)
  await page.getByRole('link', { name: 'Cancel' }).click()

  await expect(page).toHaveURL(/\/users$/)
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('of 25')
})

test('F2: a created user is still there after a reload', async ({ page }) => {
  await fillForm(page)
  await createButton(page).click()
  await expect(page).toHaveURL(/\/users$/)

  await page.reload()
  await expect(page.getByRole('row').nth(1).getByRole('rowheader')).toHaveText('Zoe Adams')
})
