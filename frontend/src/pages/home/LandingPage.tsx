import { Link, Navigate } from 'react-router-dom'
import PageHeading from '@/components/PageHeading'
import { buttonClass } from '@/components/ui/buttonStyles'
import { useCurrentUser } from '@/hooks/useAuth'

const entries = [
  {
    title: '生成与上传',
    hint: '描述画面生成候选图，或上传已有图片作为素材。',
    to: '/create',
    number: '01',
  },
  {
    title: '精修与编排',
    hint: '通过 AI 指令修改图片，结合图层、选区和画布工具精修。',
    to: '/editor',
    number: '02',
  },
  {
    title: '交付与导出',
    hint: '生成营销画面和投放尺寸，把最终结果打包下载。',
    to: '/marketing',
    number: '03',
  },
]

export default function LandingPage() {
  const { user } = useCurrentUser()
  if (user) return <Navigate to="/create" replace />
  return (
    <div className="page">
      <PageHeading title="图片工作台" description="把生成、编辑与交付放在同一个工作空间。" />
      <section className="panel mb-8">
        <div className="section-heading">
          <h2>开始一个项目</h2>
          <span className="text-xs text-muted">JPG / PNG / WebP</span>
        </div>
        <p className="text-muted mb-6 leading-relaxed">
          登录后上传一张图片，或从一段画面描述开始。素材和编辑记录会保存在你的账号中。
        </p>
        <Link to="/auth" className={buttonClass({ variant: 'solid' })}>
          开始创作
        </Link>
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
        {entries.map((entry) => (
          <Link key={entry.to} to={entry.to} className="panel hover:border-brand">
            <span className="text-xs text-muted">{entry.number}</span>
            <h2 className="mt-4 mb-2 text-base font-semibold">{entry.title}</h2>
            <p className="text-muted leading-relaxed">{entry.hint}</p>
            <span className="mt-6 block text-xs">打开工具 →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
