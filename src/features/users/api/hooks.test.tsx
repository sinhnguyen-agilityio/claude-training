import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import {
  useCreateUser,
  useDeleteUser,
  useResetData,
  useUpdateUser,
  useUser,
  userKeys,
  useUsers,
} from '@/features/users/api/hooks'
import type { UsersQueryInput } from '@/features/users/query'
import { seedUsers } from '@/mocks/seed'

const anna = seedUsers[0]!

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

describe('useUsers', () => {
  it('loads a page of users', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useUsers({ role: 'admin' }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.total).toBe(5)
  })

  it('keeps the previous page while the next one loads', async () => {
    const { wrapper } = setup()
    const { result, rerender } = renderHook((query: UsersQueryInput) => useUsers(query), {
      wrapper,
      initialProps: { page: 1 },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender({ page: 2 })
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.data?.page).toBe(1)
    await waitFor(() => expect(result.current.data?.page).toBe(2))
  })
})

describe('useUser', () => {
  it('loads one user', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useUser(anna.id), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(anna))
  })

  it('exposes a 404 as an error', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useUser('missing'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ status: 404 })
  })
})

describe('mutations', () => {
  async function loadList(wrapper: ReturnType<typeof setup>['wrapper']) {
    const list = renderHook(() => useUsers({}), { wrapper })
    // Read `data` here: useQuery only re-renders for properties that were read (tracked props).
    await waitFor(() => expect(list.result.current.data?.total).toBe(25))
    return list
  }

  it('create refreshes the list and caches the new user', async () => {
    const { queryClient, wrapper } = setup()
    const list = await loadList(wrapper)
    const { result } = renderHook(() => useCreateUser(), { wrapper })

    let id = ''
    await act(async () => {
      const user = await result.current.mutateAsync({
        firstName: 'Zoe',
        lastName: 'Adams',
        email: 'zoe@example.com',
        role: 'viewer',
      })
      id = user.id
    })

    await waitFor(() => expect(list.result.current.data?.total).toBe(26))
    expect(list.result.current.data?.data[0]?.id).toBe(id)
    expect(queryClient.getQueryData(userKeys.detail(id))).toMatchObject({ firstName: 'Zoe' })
  })

  it('update refreshes the list and the cached user', async () => {
    const { queryClient, wrapper } = setup()
    const list = await loadList(wrapper)
    const { result } = renderHook(() => useUpdateUser(), { wrapper })

    await act(() => result.current.mutateAsync({ id: anna.id, patch: { firstName: 'Ania' } }))

    expect(queryClient.getQueryData(userKeys.detail(anna.id))).toMatchObject({
      firstName: 'Ania',
    })
    const annaInList = list.result.current.data?.data.find((user) => user.id === anna.id)
    // Anna is the oldest user, so she is not on the first page; the list was still refetched.
    expect(annaInList).toBeUndefined()
    expect(queryClient.getQueryState(userKeys.list({}))?.dataUpdateCount).toBe(2)
  })

  it('delete refreshes the list and drops the cached user', async () => {
    const { queryClient, wrapper } = setup()
    const list = await loadList(wrapper)
    queryClient.setQueryData(userKeys.detail(anna.id), anna)
    const { result } = renderHook(() => useDeleteUser(), { wrapper })

    await act(() => result.current.mutateAsync(anna.id))

    await waitFor(() => expect(list.result.current.data?.total).toBe(24))
    expect(queryClient.getQueryData(userKeys.detail(anna.id))).toBeUndefined()
  })

  it('reset clears cached users and refetches the list', async () => {
    const { queryClient, wrapper } = setup()
    const list = await loadList(wrapper)
    const remove = renderHook(() => useDeleteUser(), { wrapper })
    await act(() => remove.result.current.mutateAsync(anna.id))
    await waitFor(() => expect(list.result.current.data?.total).toBe(24))
    queryClient.setQueryData(userKeys.detail('stale'), anna)
    const { result } = renderHook(() => useResetData(), { wrapper })

    await act(() => result.current.mutateAsync())

    await waitFor(() => expect(list.result.current.data?.total).toBe(25))
    expect(queryClient.getQueryData(userKeys.detail('stale'))).toBeUndefined()
  })
})
