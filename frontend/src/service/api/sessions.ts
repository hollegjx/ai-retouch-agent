import { api } from '@/request'
import type {
  Session,
  SessionDetail,
  HistoryEntry,
  SessionCreateInput,
  SessionPatchInput,
  ToolInvoke,
  Selection,
  SelectInput,
} from '@/types/sessions'

export const sessionsApi = {
  create: (input: SessionCreateInput) => api.post<SessionDetail>('/sessions', input),
  list: () => api.get<Session[]>('/sessions'),
  get: (id: string) => api.get<SessionDetail>(`/sessions/${id}`),
  patch: (id: string, input: SessionPatchInput) =>
    api.patch<SessionDetail>(`/sessions/${id}`, input),
  history: (id: string) => api.get<HistoryEntry[]>(`/sessions/${id}/history`),
  invoke: (id: string, tool: string, params: Record<string, unknown> = {}) =>
    api.post<ToolInvoke>(`/sessions/${id}/tools`, { tool, params }),
  undo: (id: string) => api.post<SessionDetail>(`/sessions/${id}/undo`),
  redo: (id: string) => api.post<SessionDetail>(`/sessions/${id}/redo`),
  select: (id: string, input: SelectInput) =>
    api.post<Selection>(`/sessions/${id}/selection`, input),
  prepareSelection: (id: string) => api.post<void>(`/sessions/${id}/selection/prepare`),
  getSelection: (id: string) => api.get<Selection | null>(`/sessions/${id}/selection`),
  clearSelection: (id: string) => api.delete<void>(`/sessions/${id}/selection`),
  export: (id: string, asset_ids: string[] = []) =>
    api.download(`/sessions/${id}/exports`, '物料.zip', { asset_ids }),
}
