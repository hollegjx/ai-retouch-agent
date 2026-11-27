import { useEffect, useRef, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type { PlanStep, StepStatus, Turn } from '@/types/agent'
import { isTerminal } from '@/lib/runs'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'
import { usePlanActions, useTurns } from '@/hooks/useAgent'
import StatePanel from '@/components/ui/StatePanel'
import { errorMessage } from '@/utils/errors'
import { useRun } from '@/hooks/useRun'

const STEP_LABEL: Record<StepStatus, string> = {
  pending: '等待中',
  waiting: '待确认',
  queued: '排队中',
  running: '进行中',
  succeeded: '已完成',
  failed: '未完成',
  canceled: '已取消',
}

export default function AgentConversation({ sessionId }: { sessionId: string }) {
  const { data: turns = [], isPending, isError, error, refetch } = useTurns(sessionId)
  const end = useRef<HTMLDivElement>(null)
  const latest = turns.at(-1)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [turns.length, latest?.status])

  if (isPending) {
    return <p className="text-faint min-h-0 flex-1 px-4 py-4 text-xs">加载中…</p>
  }

  if (isError)
    return (
      <div className="flex-1 p-3">
        <StatePanel
          error
          title="对话加载失败"
          description={errorMessage(error)}
          onRetry={() => void refetch()}
        />
      </div>
    )

  if (turns.length === 0) {
    return (
      <p className="text-faint min-h-0 flex-1 px-4 py-4 text-xs leading-relaxed">
        用一句话说明要怎么改，例如「水平翻转」或「去背景再调亮一点」。多步计划会先列出再执行。
      </p>
    )
  }

  return (
    <div className="scrollbar-slim min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {turns.map((turn) => (
        <TurnBlock key={turn.id} turn={turn} sessionId={sessionId} />
      ))}
      <div ref={end} />
    </div>
  )
}

function TurnBlock({ turn, sessionId }: { turn: Turn; sessionId: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="chat-bubble bg-ink ml-8 self-end rounded-[18px] rounded-br-md px-3.5 py-2 text-[13px] leading-relaxed text-white">
        {turn.goal}
      </p>

      {turn.error ? (
        <p className="chat-bubble text-danger bg-[var(--danger-soft)] mr-8 self-start rounded-[18px] rounded-bl-md px-3.5 py-2 text-[13px] leading-relaxed [animation-delay:120ms]">
          {turn.error}
        </p>
      ) : (
        <p className="chat-bubble bg-soft text-ink mr-8 self-start rounded-[18px] rounded-bl-md px-3.5 py-2 text-[13px] leading-relaxed [animation-delay:120ms]">
          {turn.reply}
        </p>
      )}

      {turn.steps.map((step, index) => (
        <StepCard key={step.id} index={index + 1} step={step} sessionId={sessionId} />
      ))}

      <PlanActions turn={turn} sessionId={sessionId} />
    </div>
  )
}

function PlanActions({ turn, sessionId }: { turn: Turn; sessionId: string }) {
  const actions = usePlanActions(sessionId)
  if (turn.status === 'queued') {
    return (
      <div className="mr-6 flex gap-2">
        <Action disabled={actions.busy} onClick={() => actions.confirm(turn.id)}>
          执行计划
        </Action>
        <Action disabled={actions.busy} onClick={() => actions.cancel(turn.id)}>
          取消
        </Action>
      </div>
    )
  }
  if (turn.status === 'running') {
    return (
      <div className="mr-6">
        <Action disabled={actions.busy} onClick={() => actions.cancel(turn.id)}>
          取消后续
        </Action>
      </div>
    )
  }
  if (turn.status === 'failed') {
    return (
      <div className="mr-6">
        <Action disabled={actions.busy} onClick={() => actions.retry(turn.id)}>
          重试失败步骤
        </Action>
      </div>
    )
  }
  return null
}

function Action({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Button variant="outline" size="sm" disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  )
}

function StepCard({
  index,
  step,
  sessionId,
}: {
  index: number
  step: PlanStep
  sessionId: string
}) {
  const queryClient = useQueryClient()
  const { status, progress, stage, error } = useRun(step.run_id)
  const watched = useRef(false)
  const current = status ?? step.status
  const running = current === 'queued' || current === 'running'

  useEffect(() => {
    if (status === 'queued' || status === 'running') watched.current = true
    if (!watched.current || !status || !isTerminal(status)) return
    watched.current = false
    void queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    void queryClient.invalidateQueries({ queryKey: ['session', sessionId, 'history'] })
    void queryClient.invalidateQueries({ queryKey: ['session', sessionId, 'messages'] })
  }, [status, sessionId, queryClient])

  return (
    <div className="animate-rise mr-8 rounded-[14px] px-3.5 py-2.5 shadow-[0_0_0_1px_var(--border)]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-ink text-[13px] font-medium">
          {index}. {step.label}
        </span>
        <span className="text-faint shrink-0 text-xs tabular-nums">
          {running ? `${progress}%` : STEP_LABEL[current]}
        </span>
      </div>

      {running && (
        <>
          <ProgressBar value={progress} className="mt-2 h-1" />
          <p className="text-faint mt-2 text-xs">{stage}</p>
        </>
      )}

      {error && <p className="text-danger mt-2 text-xs leading-relaxed">{error}</p>}
    </div>
  )
}
