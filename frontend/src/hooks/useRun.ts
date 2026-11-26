import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { isTerminal } from '@/lib/runs'
import { runsApi } from '@/service/api/runs'
import type { GenerateInput } from '@/types/runs'
import { useSmoothedProgress } from '@/hooks/useSmoothedProgress'

import { parseRunProgress, resolveRunProgress, type RunProgress } from '@/lib/runProgress'
import { ApiError } from '@/request'

const runKey = (id: string) => ['run', id]

export function useGenerate() {
  return useMutation({ mutationFn: (input: GenerateInput) => runsApi.generate(input) })
}

/**
 * 合并两个进度来源：SSE 提供实时状态，快照接口提供候选图与刷新后的恢复能力。
 */
export function useRun(runId: string | null) {
  const queryClient = useQueryClient()
  const [live, setLive] = useState<RunProgress | null>(null)

  const snapshot = useQuery({
    queryKey: runKey(runId ?? ''),
    queryFn: () => runsApi.get(runId as string),
    enabled: Boolean(runId),
    refetchInterval: (query) =>
      query.state.data && !isTerminal(query.state.data.status) ? 5000 : false,
  })

  const snapshotStatus = snapshot.data?.status

  useEffect(() => {
    // 已结束的任务不必再挂 SSE，否则重连会反复打快照、刷新签名 URL
    if (!runId || (snapshotStatus && isTerminal(snapshotStatus))) return

    const source = new EventSource(`/events/runs/${runId}`)
    source.onmessage = (event) => {
      const payload = parseRunProgress(event.data)
      if (!payload || payload.id !== runId) return
      setLive(payload)
      if (isTerminal(payload.status)) {
        source.close()
        void queryClient.invalidateQueries({ queryKey: runKey(runId) })
      }
    }

    return () => source.close()
  }, [runId, snapshotStatus, queryClient])

  const run = snapshot.data
  const current = resolveRunProgress(runId, run, live)
  const status = current?.status
  const reported = current?.progress ?? 0
  const progress = useSmoothedProgress({
    reported,
    status,
    token: runId,
  })

  return {
    status,
    progress,
    stage: current?.stage ?? '',
    error: current?.error ?? null,
    prompt: run?.prompt ?? null,
    candidates: run?.candidates ?? [],
    result: current?.result ?? {},
    isLoading: snapshot.isPending,
    notFound: snapshot.error instanceof ApiError && snapshot.error.status === 404,
    loadError: snapshot.error,
    refetch: snapshot.refetch,
  }
}
