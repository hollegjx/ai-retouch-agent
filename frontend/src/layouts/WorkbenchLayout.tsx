import { Suspense, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import BrandMark from '@/components/BrandMark'
import ParticleField from '@/components/ParticleField'
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
  // 只按一级路径换场：同一功能内切换会话不重播入场，也不重建页面状态
  const section = location.pathname.split('/')[1] || 'home'
  const signOut = () => {
    if (logout.isPending) return
    logout.mutate(undefined, {
      onSuccess: () => navigate('/', { replace: true }),
      onError: (error) => toast(errorMessage(error)),
    })
  }
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link to="/" className="app-brand" aria-label="AI 修图首页">
          <BrandMark size="sm">
            <span className="text-[15px] font-semibold tracking-[-0.02em]">AI 修图</span>
          </BrandMark>
        </Link>
        <div className="app-account">
          {user ? (
            <>
              <span className="app-avatar" aria-hidden>
                {user.username.slice(0, 1)}
              </span>
              <span className="text-muted hidden max-w-28 truncate text-[13px] sm:inline">
                {user.username}
              </span>
              <Button size="sm" disabled={logout.isPending} onClick={signOut}>
                {logout.isPending ? '退出中' : '退出'}
              </Button>
            </>
          ) : (
            <Link to="/auth" className={buttonClass({ variant: 'solid', size: 'sm' })}>
              登录
            </Link>
          )}
        </div>
      </header>
      <NavTrack pathname={location.pathname} />
      {/* 首页自带粒子；编辑器是工作区，不加背景动效 */}
      {section !== 'home' && section !== 'editor' && (
        <ParticleField className="app-backdrop" density={0.5} linkOpacity={0.11} />
      )}
      <main className="app-main" id="main">
        <div key={section} className="route-view">
          <Suspense
            fallback={
              <div className="route-fallback" role="status" aria-label="正在打开">
                <span className="spinner" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>
      <ToastHost />
    </div>
  )
}

/** 分段式导航：白色滑块按当前项的位置和宽度弹性移动。 */
function NavTrack({ pathname }: { pathname: string }) {
  const track = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<{ x: number; width: number } | null>(null)
  const [animate, setAnimate] = useState(false)

  const measure = useCallback(() => {
    const active = track.current?.querySelector<HTMLElement>('a.active')
    setIndicator(active ? { x: active.offsetLeft, width: active.offsetWidth } : null)
  }, [])

  useLayoutEffect(() => {
    measure()
    // 首次定位不做动画，之后的切换才滑动
    const frame = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(frame)
  }, [pathname, measure])

  useLayoutEffect(() => {
    const element = track.current
    if (!element) return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [measure])

  return (
    <nav className="app-nav" aria-label="工作台导航">
      <div className="nav-items" ref={track}>
        <span
          className="nav-indicator"
          data-animate={animate}
          aria-hidden
          style={{
            width: indicator?.width ?? 0,
            transform: `translateX(${indicator?.x ?? 0}px)`,
            opacity: indicator ? 1 : 0,
          }}
        />
        <ul>
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
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
