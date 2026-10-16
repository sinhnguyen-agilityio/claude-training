import { expect, test, type Locator } from '@playwright/test'

const HOVER_BLUE = 'rgb(29, 78, 216)' // #1d4ed8
const REST_RED = 'oklch(0.505 0.213 27.518)' // Tailwind v4 red-700

function style(locator: Locator) {
  return locator.evaluate((element) => {
    const { fontWeight, color, cursor, backgroundColor } = getComputedStyle(element)
    const { width, height } = element.getBoundingClientRect()
    return { fontWeight, color, cursor, backgroundColor, width, height }
  })
}

test('the list Delete button turns its text bold and blue on hover, at a fixed size', async ({
  page,
}) => {
  await page.goto('/users')
  const button = page.getByRole('button', { name: 'Delete Ben Wright' })
  await expect(button).toBeVisible()

  const rest = await style(button)
  expect(rest).toMatchObject({ fontWeight: '500', color: REST_RED, cursor: 'pointer' })

  await button.hover()

  await expect
    .poll(() => style(button))
    .toEqual({
      ...rest,
      fontWeight: '700',
      color: HOVER_BLUE,
    })
})

test('a disabled list Delete button gets no hover effect', async ({ page }) => {
  await page.goto('/users')
  const button = page.getByRole('button', { name: 'Delete Ben Wright' })
  await button.evaluate((element) => element.setAttribute('disabled', ''))

  await button.hover({ force: true })

  expect(await style(button)).toMatchObject({
    fontWeight: '500',
    color: REST_RED,
    cursor: 'not-allowed',
  })
})
