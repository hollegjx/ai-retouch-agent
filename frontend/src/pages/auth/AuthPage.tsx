import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import BrandMark from '@/components/BrandMark'
import StatePanel from '@/components/ui/StatePanel'
import { buttonClass } from '@/components/ui/buttonStyles'
import { useAuthActions, useCurrentUser } from '@/hooks/useAuth'
import { errorMessage } from '@/utils/errors'
import { safeRedirect } from '@/utils/navigation'

export default function AuthPage() {
  const [params, setParams] = useSearchParams()
  const registering = params.get('mode') === 'register'
  const target = safeRedirect(params.get('redirect'))
  const navigate = useNavigate()
  const { user, isLoading, error, refetch } = useCurrentUser()
  const { login, register } = useAuthActions()
  const action = registering ? register : login
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  if (!isLoading && user) return <Navigate to={target} replace />
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="mb-6 inline-block text-sm text-muted">
          ← 返回工作台
        </Link>
        <section className="panel">
          <BrandMark size="sm">
            <span className="font-semibold">AI 修图</span>
          </BrandMark>
          <h1 className="mt-8 text-xl font-semibold">{registering ? '创建账号' : '欢迎回来'}</h1>
          <p className="mt-2 text-sm text-muted">
            {registering ? '保存素材、编辑记录和每一次创作。' : '登录后继续你的图片项目。'}
          </p>
          {error && (
            <div className="mt-4">
              <StatePanel
                title="服务连接失败"
                description={errorMessage(error)}
                error
                onRetry={() => void refetch()}
              />
            </div>
          )}
          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (action.isPending) return
              action.mutate(
                { username: username.trim(), password },
                { onSuccess: () => navigate(target, { replace: true }) },
              )
            }}
          >
            <label className="block">
              <span className="form-label">用户名</span>
              <input
                className="form-field"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                autoComplete="username"
                maxLength={32}
                placeholder="输入用户名"
                disabled={action.isPending}
              />
              {registering && (
                <span className="mt-2 block text-xs text-muted">3–32 位字母、数字或下划线</span>
              )}
            </label>
            <label className="block">
              <span className="form-label">密码</span>
              <input
                className="form-field"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete={registering ? 'new-password' : 'current-password'}
                minLength={registering ? 6 : undefined}
                maxLength={64}
                placeholder="输入密码"
                disabled={action.isPending}
              />
            </label>
            {action.isError && (
              <p className="text-danger text-sm" role="alert">
                {errorMessage(action.error)}
              </p>
            )}
            <button
              type="submit"
              className={buttonClass({ variant: 'solid', block: true })}
              disabled={action.isPending}
            >
              {action.isPending ? '处理中…' : registering ? '创建账号' : '登录'}
            </button>
          </form>
          <button
            type="button"
            disabled={action.isPending}
            className="mt-6 text-sm text-muted hover:text-ink"
            onClick={() => {
              login.reset()
              register.reset()
              setParams({ mode: registering ? 'login' : 'register', redirect: target })
            }}
          >
            {registering ? '已有账号？登录' : '还没有账号？注册'}
          </button>
        </section>
      </div>
    </div>
  )
}
