import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { server } from '@/mocks/node'

// findBy*/waitFor default to 1 s. The 300 ms search debounce plus a request can exceed that when the
// machine is busy (e.g. a coverage run), so allow more time; passing tests are not slowed down.
configure({ asyncUtilTimeout: 3000 })

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

// Every test starts from the seed data and a fresh tab.
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
