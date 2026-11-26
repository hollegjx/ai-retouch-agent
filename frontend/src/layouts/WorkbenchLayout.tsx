import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import BrandMark from '@/components/BrandMark'
import ToastHost from '@/components/ToastHost'
import Button from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonStyles'
import { useAuthActions, useCurrentUser } from '@/hooks/useAuth'
import { errorMessage } from '@/utils/errors'
import { toast } from '@/stores/toasts'

const NAV_ITEMS = [
  { to: '/create', label: '创作素材', icon: 'M12 4v16m8-8H4' },
  { to: '/editor', label: '图片编辑', icon: 'M4 20h4L20 8l-4-4L4 16v4z' },
  { to: '/marketing', label: '营销交付', icon: 'M12 3v12m0 0-4-4m4 4 4-4M5 21h14' },
  { to: '/batch', label: '批量处理', icon: 'M4 6h16M4 12h16M4 18h10' },
]

export default function WorkbenchLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useCurrentUser()
  const { logout } = useAuthActions()
  const current = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))
  const signOut = () => {
    if (logout.isPending) return
    logout.mutate(undefined, {
      onSuccess: () => navigate('/', { replace: true }),
      onError: (error) => toast(errorMessage(error)),
    })
  }
  return (
    <div className="app-shell">
      <nav className="app-nav" aria-label="工作台导航">
        <Link to="/" className="app-brand">
          <BrandMark size="sm">
            <span className="font-semibold">AI 修图</span>
          </BrandMark>
        </Link>
        <p className="app-nav-caption">图片工作空间</p>
        <ul className="nav-items">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <svg viewBox="0 0 24 24" fill="none" className="size-5 shrink-0" aria-hidden="true">
                  <path
                    d={item.icon}
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="nav-account">
          <p className="text-xs text-muted leading-relaxed">
            从一张素材到完整交付
            <br />
            生成 · 编辑 · 导出
          </p>
        </div>
      </nav>
      <div className="app-body">
        <header className="app-header">
          <div className="flex items-center gap-2">
            <span className="text-muted text-xs">工作空间</span>
            <span className="text-muted" aria-hidden>
              /
            </span>
            <span className="font-medium">
              {current?.label ??
                (location.pathname.startsWith('/candidates') ? '生成结果' : '开始创作')}
            </span>
          </div>
          {user ? (
            <div className="flex min-w-0 items-center gap-2">
              <span className="max-w-24 truncate text-xs text-muted">{user.username}</span>
              <Button size="sm" disabled={logout.isPending} onClick={signOut}>
                {logout.isPending ? '退出中' : '退出'}
              </Button>
            </div>
          ) : (
            <Link to="/auth" className={buttonClass({ variant: 'outline', size: 'sm' })}>
              登录
            </Link>
          )}
        </header>
        <main className="app-main" id="main">
          <Outlet />
        </main>
      </div>
      <ToastHost />
    </div>
  )
}
