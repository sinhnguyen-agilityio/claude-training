import { expect, test } from './fixtures.js'

// AC5: the reset fixture gives every test the seed. The first test adds a user, the second proves
// it is gone. Serial, because the workers share one database.
test.describe.configure({ mode: 'serial' })

test('adds a user to the database', async ({ request, page }) => {
  await page.goto('/users')
  const created = await request.post('/api/users', {
    data: {
      firstName: 'Reset',
      lastName: 'Probe',
      email: 'reset.probe@example.com',
      role: 'viewer',
    },
  })
  expect(created.status()).toBe(201)
})

test('the next test starts from the 25 seed users again', async ({ request }) => {
  const body = await (await request.get('/api/users')).json()
  expect(body.total).toBe(25)
})
