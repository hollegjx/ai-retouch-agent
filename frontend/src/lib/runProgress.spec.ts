import { expect, it } from 'vitest'
import { parseRunProgress, resolveRunProgress, type RunProgress } from './runProgress'
import type { Run } from '@/types/runs'

it('损坏或字段不完整的 SSE 不会污染任务状态', () => {
  expect(parseRunProgress('broken')).toBeNull()
  expect(parseRunProgress('{"status":"running"}')).toBeNull()
  const value = {
    id: 'run-1',
    tool: 'generate_image',
    status: 'succeeded',
    progress: 100,
    stage: '已完成',
    error: null,
    result: {},
  }
  expect(parseRunProgress(JSON.stringify(value))).toEqual(value)
})

const live: RunProgress = {
  id: 'run-1',
  tool: 'generate_image',
  status: 'running',
  progress: 30,
  stage: '正在生成',
  error: null,
  result: {},
}

it('轮询发现任务结束后，进度文案与结果一起采用最终快照', () => {
  const snapshot: Run = {
    ...live,
    status: 'succeeded',
    progress: 100,
    stage: '已完成',
    result: { asset_ids: ['asset-1'] },
    prompt: null,
    candidates: [],
  }
  expect(resolveRunProgress('run-1', snapshot, live)).toEqual(snapshot)
})

it('运行中的任务采用实时进度，切换任务后不沿用旧连接', () => {
  const snapshot: Run = { ...live, progress: 10, prompt: null, candidates: [] }
  expect(resolveRunProgress('run-1', snapshot, live)?.progress).toBe(30)
  expect(resolveRunProgress('run-2', undefined, live)).toBeUndefined()
})
