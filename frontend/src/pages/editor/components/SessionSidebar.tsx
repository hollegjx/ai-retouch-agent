import { useState } from 'react'
import StatePanel from '@/components/ui/StatePanel'
import { Link, NavLink } from 'react-router-dom'

import AgentConversation from '@/pages/editor/components/AgentConversation'
import MessageComposer from '@/pages/editor/components/MessageComposer'
import Button from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonStyles'
import { useSendMessage, useTurns } from '@/hooks/useAgent'
import { errorMessage } from '@/utils/errors'
import { useSessions } from '@/hooks/useSessions'
import { formatDateTime } from '@/lib/format'

export default function SessionSidebar({
  activeId,
  onOpen,
}: {
  activeId: string
  onOpen?: () => void
}) {
  // 历史对话默认收起，尽量把纵向空间留给当前对话
  const [historyOpen, setHistoryOpen] = useState(!activeId)

  return (
    <aside className="bg-paper flex min-h-0 flex-1 flex-col border-r border-[var(--hairline)]">
      <div className="flex items-center gap-2 border-b border-[var(--hairline)] p-3">
        <Link to="/create" className={`${buttonClass({ variant: 'solid', size: 'sm' })} flex-1`}>
          新建项目
        </Link>
        <Button size="sm" active={historyOpen} onClick={() => setHistoryOpen((open) => !open)}>
          历史
        </Button>
      </div>

      {historyOpen && <SessionList activeId={activeId} onOpen={onOpen} />}

      {activeId ? (
        <Conversation sessionId={activeId} />
      ) : (
        <p className="text-faint min-h-0 flex-1 px-4 py-4 text-xs leading-relaxed">
          打开一个历史对话，或回到创作页开始新的一张。
        </p>
      )}
    </aside>
  )
}

function Conversation({ sessionId }: { sessionId: string }) {
  const send = useSendMessage(sessionId)
  const { data: turns = [] } = useTurns(sessionId)
  const planActive = turns.some((turn) => turn.status === 'queued' || turn.status === 'running')

  return (
    <>
      <AgentConversation sessionId={sessionId} />
      <MessageComposer
        pending={send.isPending || planActive}
        error={send.isError ? errorMessage(send.error) : null}
        placeholder={
          planActive
            ? '当前计划进行中，确认、取消或等它结束后再发'
            : '说明要怎么改，例如：去背景再水平翻转。回车发送'
        }
        onSend={(text) => send.mutate(text)}
      />
    </>
  )
}

function SessionList({ activeId, onOpen }: { activeId: string; onOpen?: () => void }) {
  const { data: sessions = [], isPending, isError, error, refetch } = useSessions()

  if (isPending) {
    return (
      <p className="text-faint flex items-center gap-2 border-b border-[var(--hairline)] px-4 py-3 text-xs">
        <span className="spinner size-3.5 border-[1.5px]" aria-hidden />
        加载中…
      </p>
    )
  }

  if (isError)
    return (
      <StatePanel
        error
        title="历史加载失败"
        description={errorMessage(error)}
        onRetry={() => void refetch()}
      />
    )

  if (sessions.length === 0) {
    return (
      <p className="text-faint border-b border-[var(--hairline)] px-4 py-3 text-xs">还没有会话</p>
    )
  }

  return (
    <ul className="scrollbar-slim animate-fade-in max-h-56 shrink-0 space-y-0.5 overflow-y-auto border-b border-[var(--hairline)] p-2">
      {sessions.map((session) => (
        <li key={session.id}>
          <NavLink
            to={`/editor/${session.id}`}
            onClick={onOpen}
            className={`block rounded-[10px] px-3 py-2 ${
              session.id === activeId ? 'bg-ink text-white' : 'text-ink hover:bg-soft'
            }`}
          >
            <span className="block truncate text-xs font-medium">{session.title}</span>
            <span
              className={`block text-xs tabular-nums ${session.id === activeId ? 'text-white/60' : 'text-faint'}`}
            >
              {formatDateTime(session.updated_at)}
            </span>
          </NavLink>
        </li>
      ))}
    </ul>
  )
}
