import type { Asset } from '@/types/assets'
import type { Run } from '@/types/runs'
export type BatchTool =
  | 'remove_background'
  | 'replace_background'
  | 'adjust_image'
  | 'upscale_image'
  | 'expand_canvas'
  | 'prepare_delivery_sizes'

export type BatchOp = {
  tool: BatchTool
  params: Record<string, unknown>
}

export type BatchItem = {
  source: Asset
  status: 'pending' | 'running' | 'succeeded' | 'failed'
  error: string | null
  outputs: Asset[]
}

export type Batch = {
  run: Run
  items: BatchItem[]
  created_at: string
}

export type BatchInput = {
  asset_ids: string[]
  operations: BatchOp[]
  formats: Array<'png' | 'jpg'>
}
