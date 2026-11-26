import { api } from '@/request'
import type { Run } from '@/types/runs'
import type { Batch, BatchInput } from '@/types/batches'

export const batchesApi = {
  create: (input: BatchInput) => api.post<Run>('/batches', input),
  list: () => api.get<Batch[]>('/batches'),
  get: (id: string) => api.get<Batch>(`/batches/${id}`),
  export: (id: string) => api.download(`/batches/${id}/export`, '批量导出.zip'),
}
