import { api } from '@/request'
import type { Asset, LibraryGroup } from '@/types/assets'

export const assetsApi = {
  async upload(file: File): Promise<Asset> {
    const body = new FormData()
    body.append('file', file)

    return api.upload<Asset>('/assets', body)
  },

  async list(limit = 50): Promise<Asset[]> {
    return api.get<Asset[]>(`/assets?limit=${limit}`)
  },

  async library(limit = 50): Promise<LibraryGroup[]> {
    return api.get<LibraryGroup[]>(`/assets/library?limit=${limit}`)
  },
}
