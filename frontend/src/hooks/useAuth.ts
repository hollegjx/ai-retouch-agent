import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/service/api/auth'
import type { Credentials, User } from '@/types/auth'
import { ApiError } from '@/request'

export const ME_KEY = ['auth', 'me']

export function useCurrentUser() {
  const query = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await authApi.me()
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    retry: false,
    staleTime: 60_000,
  })
  return {
    user: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useAuthActions() {
  const queryClient = useQueryClient()
  const cacheUser = (user: User) => queryClient.setQueryData(ME_KEY, user)
  const login = useMutation({
    mutationFn: (body: Credentials) => authApi.login(body),
    onSuccess: cacheUser,
  })
  const register = useMutation({
    mutationFn: (body: Credentials) => authApi.register(body),
    onSuccess: cacheUser,
  })
  const logout = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(ME_KEY, null)
    },
  })
  return { login, register, logout }
}
