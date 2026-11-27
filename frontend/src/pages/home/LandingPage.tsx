import { useRef } from 'react'
import { Link, Navigate } from 'react-router-dom'
import ParticleField from '@/components/ParticleField'
import Reveal from '@/components/Reveal'
import { buttonClass } from '@/components/ui/buttonStyles'
import { useCurrentUser } from '@/hooks/useAuth'
import HeroDemo from '@/pages/home/components/HeroDemo'

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
  const flow = useRef<HTMLElement>(null)
  if (user) return <Navigate to="/create" replace />
  return (
    <div className="landing">
      <section className="landing-hero">
        <ParticleField className="hero-particles" density={0.8} />
        <p className="hero-eyebrow hero-in hero-in-1">AI 修图智能体</p>
        <h1 className="hero-title hero-in hero-in-2">图片工作台</h1>
        <p className="hero-sub hero-in hero-in-3">把生成、编辑与交付放在同一个工作空间。</p>
        <div className="hero-cta hero-in hero-in-4">
          <Link to="/auth" className={buttonClass({ variant: 'solid' })}>
            开始创作
          </Link>
          <button
            type="button"
            className="text-link"
            onClick={() => flow.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            了解流程 <span className="chev">›</span>
          </button>
        </div>
        <HeroDemo />
      </section>

      <section className="landing-dark" ref={flow}>
        <ParticleField tone="paper" className="dark-particles" density={0.75} linkOpacity={0.22} />
        <Reveal className="mx-auto max-w-[1120px]">
          <p className="section-kicker">工作流程</p>
          <h2 className="section-title">
            从一张素材，
            <br />
            到完整交付。
          </h2>
        </Reveal>
        <div className="step-grid">
          {entries.map((entry, index) => (
            <Reveal key={entry.to} delay={index * 120} className="h-full">
              <Link to={entry.to} className="step-card h-full">
                <span className="step-num">{entry.number}</span>
                <h3>{entry.title}</h3>
                <p>{entry.hint}</p>
                <span className="text-link">
                  打开工具 <span className="chev">›</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="landing-close">
        <ParticleField className="close-particles" density={0.6} />
        <Reveal>
          <h2 className="section-title">现在开始。</h2>
          <p className="hero-sub">
            登录后上传一张图片，或从一段画面描述开始。素材和编辑记录会保存在你的账号中。
          </p>
          <div className="hero-cta">
            <Link to="/auth" className={buttonClass({ variant: 'solid' })}>
              开始创作
            </Link>
            <span className="text-faint text-[13px]">JPG / PNG / WebP</span>
          </div>
        </Reveal>
      </section>

      <footer className="landing-foot">AI 修图智能体 · 生成 · 编辑 · 导出</footer>
    </div>
  )
}
