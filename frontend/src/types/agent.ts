import type { RunStatus } from '@/types/runs'

export type StepStatus =
  'pending' | 'waiting' | 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'

export type PlanStep = {
  id: string
  tool: string
  label: string
  depends_on: string[]
  run_id: string | null
  status: StepStatus
}

export type Turn = {
  id: string
  revision: number
  goal: string
  reply: string
  status: RunStatus
  error: string | null
  created_at: string
  steps: PlanStep[]
}
