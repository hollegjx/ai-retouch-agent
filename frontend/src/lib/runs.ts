import type { Ratio, RunStatus } from '@/types/runs'

export const RATIO_LABELS: Record<Ratio, string> = {
  '1:1': '方形 1:1',
  '4:5': '竖版 4:5',
  '3:4': '竖版 3:4',
  '9:16': '长图 9:16',
  '16:9': '横版 16:9',
}

export function isTerminal(status: RunStatus) {
  return status === 'succeeded' || status === 'failed' || status === 'canceled'
}
