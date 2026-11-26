import { useNavigate } from 'react-router-dom'
import { useSessions } from '@/hooks/useSessions'
import { shortTitle } from '@/lib/format'

export function SessionSwitch({ currentId }: { currentId: string }) {
  const navigate = useNavigate()
  const { data: sessions = [] } = useSessions()
  if (sessions.length < 2) return null
  return (
    <select
      value={currentId}
      onChange={(event) => navigate(`/marketing/${event.target.value}`)}
      className="border-line text-ink max-w-44 shrink-0 truncate rounded-control border bg-transparent px-2 py-2 text-xs"
      aria-label="切换会话"
    >
      {sessions.map((item) => (
        <option key={item.id} value={item.id}>
          {shortTitle(item.title)}
        </option>
      ))}
    </select>
  )
}
