import { ApiError } from '@/request'

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof TypeError) return '无法连接服务，请检查网络后重试'
  return error instanceof Error ? error.message : '请求失败，请稍后重试'
}
