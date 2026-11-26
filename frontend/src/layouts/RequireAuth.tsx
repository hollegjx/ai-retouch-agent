import { Navigate, Outlet, useLocation } from 'react-router-dom'
import StatePanel from '@/components/ui/StatePanel'
import { useCurrentUser } from '@/hooks/useAuth'
import { errorMessage } from '@/utils/errors'

export default function RequireAuth() {
  const { user, isLoading, error, refetch } = useCurrentUser()
  const location = useLocation()
  if (isLoading)
    return (
      <div className="page">
        <StatePanel title="正在读取账号" loading />
      </div>
    )
  if (error)
    return (
      <div className="page">
        <StatePanel
          title="账号状态读取失败"
          description={errorMessage(error)}
          error
          onRetry={() => void refetch()}
        />
      </div>
    )
  return user ? (
    <Outlet />
  ) : (
    <Navigate
      to={`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`}
      replace
    />
  )
}
