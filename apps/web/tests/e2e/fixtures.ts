import { expect, test as base } from '@playwright/test'

// AC5: every test starts from the 25 seed users. POST /api/reset needs the API to run with
// ALLOW_RESET=true (playwright.config.ts does that) and wipes the database the API points at.
const API_PORT = Number(process.env.E2E_API_PORT) || 3101

export const test = base.extend<{ resetData: void }>({
  resetData: [
    async ({ request }, use) => {
      const response = await request
        .post(`http://localhost:${API_PORT}/api/reset`)
        .catch((error: unknown) => {
          throw new Error(
            `POST /api/reset could not reach the API on port ${API_PORT}: ${String(error)}`,
          )
        })
      expect(
        response.ok(),
        `POST /api/reset answered ${response.status()}. Is the API running with ALLOW_RESET=true and a migrated database?`,
      ).toBe(true)
      await use()
    },
    { auto: true },
  ],
})

export { expect }
