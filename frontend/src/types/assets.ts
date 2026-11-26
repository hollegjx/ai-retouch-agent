export type AssetKind =
  'original' | 'generated' | 'subject' | 'background' | 'mask' | 'marketing' | 'export'

export type Asset = {
  id: string
  kind: AssetKind
  source: 'upload' | 'generate' | 'tool'
  image_format: string
  width: number
  height: number
  size_bytes: number
  has_alpha: boolean
  created_at: string
  url: string
}

export type LibraryGroup = {
  session_id: string | null
  title: string
  updated_at: string
  cover: Asset
  assets: Asset[]
}
