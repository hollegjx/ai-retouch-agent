import type { Asset } from '@/types/assets'

export type Ratio = '1:1' | '4:5' | '3:4' | '9:16' | '16:9'

export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'

export type Run = {
  id: string
  tool: string
  status: RunStatus
  progress: number
  stage: string
  error: string | null
  prompt: string | null
  candidates: Asset[]
  result: Record<string, unknown>
}

export type GenerateInput = {
  prompt: string
  ratio: Ratio
  count: number
  negative_prompt?: string
  reference_asset_ids?: string[]
}
