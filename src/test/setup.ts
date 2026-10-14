import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { server } from '@/mocks/node'

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

// Every test starts from the seed data.
beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
