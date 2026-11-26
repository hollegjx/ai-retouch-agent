import { api } from '@/request'
import type { Turn } from '@/types/agent'

export const agentApi = {
  turns: (sessionId: string) => api.get<Turn[]>(`/sessions/${sessionId}/messages`),
  send: (sessionId: string, text: string) =>
    api.post<Turn>(`/sessions/${sessionId}/messages`, { text }),
  confirm: (sessionId: string, turnId: string) =>
    api.post<Turn>(`/sessions/${sessionId}/messages/${turnId}/confirm`),
  cancel: (sessionId: string, turnId: string) =>
    api.post<Turn>(`/sessions/${sessionId}/messages/${turnId}/cancel`),
  retry: (sessionId: string, turnId: string) =>
    api.post<Turn>(`/sessions/${sessionId}/messages/${turnId}/retry`),
}
