import { describe, expect, it } from 'vitest'
import { createQueryClient } from '@/app/queryClient'
import { ApiError } from '@/features/users/api/client'

function retryFor(failureCount: number, error: unknown) {
  const { retry } = createQueryClient().getDefaultOptions().queries ?? {}
  if (typeof retry !== 'function') throw new Error('retry should be a function')
  return retry(failureCount, error as Error)
}

describe('createQueryClient', () => {
  it('applies the app-wide query defaults', () => {
    const queries = createQueryClient().getDefaultOptions().queries

    expect(queries).toMatchObject({ staleTime: 30_000, refetchOnWindowFocus: false })
  })

  it('retries server and network errors once', () => {
    expect(retryFor(0, new ApiError(500, 'Boom'))).toBe(true)
    expect(retryFor(0, new ApiError(0, 'Offline'))).toBe(true)
    expect(retryFor(1, new ApiError(500, 'Boom'))).toBe(false)
  })

  it('never retries client errors', () => {
    expect(retryFor(0, new ApiError(404, 'User not found'))).toBe(false)
    expect(retryFor(0, new ApiError(400, 'Invalid'))).toBe(false)
  })

  it('returns a new client on every call', () => {
    expect(createQueryClient()).not.toBe(createQueryClient())
  })
})
