import { api } from '@/request'
import type { User, Credentials } from '@/types/auth'

export const authApi = {
  register: (body: Credentials) => api.post<User>('/auth/register', body),
  login: (body: Credentials) => api.post<User>('/auth/login', body),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<User>('/auth/me'),
}
