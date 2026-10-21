import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/features/users/api/client'
import type { UsersQueryInput } from '@/features/users/query'
import type { User, UserUpdate } from '@/features/users/schema'

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (query: UsersQueryInput) => [...userKeys.lists(), query] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
}

/** One page of users. Keeps the previous page on screen while the next one loads. */
export function useUsers(query: UsersQueryInput) {
  return useQuery({
    queryKey: userKeys.list(query),
    queryFn: () => usersApi.list(query),
    placeholderData: keepPreviousData,
  })
}

export function useUser(id: string) {
  return useQuery({ queryKey: userKeys.detail(id), queryFn: () => usersApi.get(id) })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: async (user) => {
      queryClient.setQueryData(userKeys.detail(user.id), user)
      await queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UserUpdate }) => usersApi.update(id, patch),
    onSuccess: async (user: User) => {
      queryClient.setQueryData(userKeys.detail(user.id), user)
      await queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: usersApi.remove,
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      // Removed last, right before the caller navigates away, so an open detail page does not
      // refetch the deleted user and flash "User not found".
      queryClient.removeQueries({ queryKey: userKeys.detail(id) })
    },
  })
}

/**
 * Restores the seed data. Cached users are dropped without refetching (an open detail page may
 * show a user that no longer exists), and lists are reset and refetched.
 */
export function useResetData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: usersApi.reset,
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: userKeys.details() })
      await queryClient.resetQueries({ queryKey: userKeys.lists() })
    },
  })
}
