import { api } from '@/request'
import type { Run, GenerateInput } from '@/types/runs'

export const runsApi = {
  generate: (input: GenerateInput) => api.post<Run>('/generations', input),
  get: (id: string) => api.get<Run>(`/runs/${id}`),
}
