import type { UsersPage, UsersQueryInput } from '@/features/users/query'
import type { User, UserCreateInput, UserUpdate } from '@/features/users/schema'

/** Error body for every non-2xx response (SPEC §4). */
export interface ApiErrorBody {
  message: string
  fieldErrors?: Record<string, string>
}

/** Thrown for any failed request. `status` is 0 when the request never reached the API. */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status)
}

async function request<T>(path: string, { json, ...init }: RequestInit & { json?: unknown } = {}) {
  let response: Response
  try {
    response = await fetch(new URL(path, window.location.origin), {
      ...init,
      ...(json !== undefined && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      }),
    })
  } catch {
    throw new ApiError(0, 'Network error. Check your connection and try again.')
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as Partial<ApiErrorBody> | null
    throw new ApiError(
      response.status,
      body?.message ?? `Request failed with status ${response.status}`,
      body?.fieldErrors,
    )
  }

  return (response.status === 204 ? undefined : await response.json()) as T
}

function toSearchParams(query: UsersQueryInput) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

/** Typed calls for every endpoint in SPEC §4. */
export const usersApi = {
  list(query: UsersQueryInput = {}) {
    const search = toSearchParams(query)
    return request<UsersPage>(`/api/users${search ? `?${search}` : ''}`)
  },
  get(id: string) {
    return request<User>(`/api/users/${encodeURIComponent(id)}`)
  },
  create(input: UserCreateInput) {
    return request<User>('/api/users', { method: 'POST', json: input })
  },
  update(id: string, patch: UserUpdate) {
    return request<User>(`/api/users/${encodeURIComponent(id)}`, { method: 'PATCH', json: patch })
  },
  remove(id: string) {
    return request<void>(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
  reset() {
    return request<void>('/api/reset', { method: 'POST' })
  },
}
