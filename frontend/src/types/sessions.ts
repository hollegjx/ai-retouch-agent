import type { Asset } from '@/types/assets'
import type { Run } from '@/types/runs'

export type LayerKind = 'image' | 'text' | 'shape'

export type Transform = {
  x: number
  y: number
  scale_x: number
  scale_y: number
  rotation: number
}

export type Layer = {
  id: string
  kind: LayerKind
  name: string
  width: number
  height: number
  asset_id: string | null
  transform: Transform
  opacity: number
  visible: boolean
  locked: boolean
  source_hash?: string | null
  text?: string | null
  font_size?: number
  fill?: string
}

export type LayerDocument = {
  width: number
  height: number
  layers: Layer[]
}

export type Session = {
  id: string
  title: string
  revision: number
  history_seq: number
  original_asset_id: string
  current_asset_id: string
  created_at: string
  updated_at: string
}

export type SessionDetail = Session & {
  document: LayerDocument
  previous_document: LayerDocument | null
  assets: Asset[]
  can_undo: boolean
  can_redo: boolean
}

export type HistoryEntry = {
  seq: number
  action: string
  params: Record<string, unknown>
  result: Record<string, unknown>
  created_at: string
}

export type SessionCreateInput = {
  current_asset_id: string
  asset_ids?: string[]
  title?: string
}

export type SessionPatchInput = {
  title?: string
  current_asset_id?: string
}

export type ToolInvoke = {
  run: Run
  session: SessionDetail
}

export type Marker = { index: number; x: number; y: number }

export type Selection = {
  revision: number
  mask: Asset
  markers: Marker[]
}

export type SelectInput = {
  revision: number
  points?: { x: number; y: number }[]
  strokes?: { x: number; y: number }[][]
  radius?: number
  append?: boolean
}
