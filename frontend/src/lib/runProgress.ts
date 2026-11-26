import type { Run } from '@/types/runs'
import { isTerminal } from '@/lib/runs'
export type RunProgress = Pick<
  Run,
  'id' | 'tool' | 'status' | 'progress' | 'stage' | 'error' | 'result'
>
const STATUSES = ['queued', 'running', 'succeeded', 'failed', 'canceled']

/** 已结束的快照包含最终结果，不能被断线前的 SSE 状态覆盖。 */
export function resolveRunProgress(
  runId: string | null,
  snapshot: Run | undefined,
  live: RunProgress | null,
): RunProgress | undefined {
  if (snapshot?.id === runId && isTerminal(snapshot.status)) return snapshot
  if (live?.id === runId) return live
  return snapshot?.id === runId ? snapshot : undefined
}

export function parseRunProgress(raw: string): RunProgress | null {
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const item = value as Record<string, unknown>
    if (
      typeof item.id !== 'string' ||
      typeof item.tool !== 'string' ||
      typeof item.status !== 'string' ||
      !STATUSES.includes(item.status) ||
      typeof item.progress !== 'number' ||
      !Number.isFinite(item.progress) ||
      typeof item.stage !== 'string' ||
      (item.error !== null && typeof item.error !== 'string') ||
      !item.result ||
      typeof item.result !== 'object' ||
      Array.isArray(item.result)
    )
      return null
    return item as RunProgress
  } catch {
    return null
  }
}
