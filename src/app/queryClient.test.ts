import { describe, expect, it } from 'vitest'
import { createQueryClient } from '@/app/queryClient'

describe('createQueryClient', () => {
  it('applies the app-wide query defaults', () => {
    const queries = createQueryClient().getDefaultOptions().queries

    expect(queries).toMatchObject({ staleTime: 30_000, retry: 1, refetchOnWindowFocus: false })
  })

  it('returns a new client on every call', () => {
    expect(createQueryClient()).not.toBe(createQueryClient())
  })
})
