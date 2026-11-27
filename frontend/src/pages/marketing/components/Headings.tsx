import { type ReactNode } from 'react'
import PageHeading from '@/components/PageHeading'

export function PageTitle({ action }: { action?: ReactNode }) {
  return (
    <PageHeading title="营销与交付" description="生成营销画面、适配投放尺寸，打包你的最终作品。">
      {action}
    </PageHeading>
  )
}

export function SectionHead({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-ink text-[19px] font-semibold tracking-[-0.022em]">{title}</h2>
      <p className="text-muted mt-1 text-[13px] leading-relaxed">{hint}</p>
    </div>
  )
}
