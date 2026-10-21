import { setupServer } from 'msw/node'
import { createHandlers } from '@/mocks/handlers'
import { createUserRepository } from '@/mocks/repository'

/** The mock API for Vitest. No latency, so tests stay fast. */
export const server = setupServer(...createHandlers(createUserRepository(), { delayMs: 0 }))
