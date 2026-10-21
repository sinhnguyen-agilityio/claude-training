import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/features/users/api/client'

/** Retry once, but never for 4xx responses: asking again will not change the answer. */
function shouldRetry(failureCount: number, error: unknown) {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false
  return failureCount < 1
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetry, refetchOnWindowFocus: false },
    },
  })
}
