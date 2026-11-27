import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeading from '@/components/PageHeading'
import StatePanel from '@/components/ui/StatePanel'
import ProgressBar from '@/components/ui/ProgressBar'
import Button from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonStyles'
import { useRun } from '@/hooks/useRun'
import { useCreateSession } from '@/hooks/useSessions'
import { errorMessage } from '@/utils/errors'

export default function CandidatesPage() {
  const { runId = '' } = useParams()
  const navigate = useNavigate()
  const [picked, setPicked] = useState<string | null>(null)
  const run = useRun(runId)
  const create = useCreateSession()
  const adopt = () => {
    if (!picked || create.isPending) return
    create.mutate(
      {
        current_asset_id: picked,
        asset_ids: run.candidates.map((asset) => asset.id),
        title: run.prompt ?? undefined,
      },
      { onSuccess: (session) => navigate(`/editor/${session.id}`) },
    )
  }
  return (
    <div className="page">
      <PageHeading title="生成结果" description="选一张继续精修，其余候选会保存在项目素材中。">
        <Link to="/create" className={buttonClass({ variant: 'outline' })}>
          返回创作
        </Link>
        {run.status === 'succeeded' && (
          <Button variant="solid" disabled={!picked || create.isPending} onClick={adopt}>
            {create.isPending ? '打开中…' : '进入编辑'}
          </Button>
        )}
      </PageHeading>
      {run.loadError ? (
        <StatePanel
          title={run.notFound ? '任务不存在' : '任务读取失败'}
          description={errorMessage(run.loadError)}
          error
          onRetry={() => void run.refetch()}
        />
      ) : run.status === 'failed' || run.status === 'canceled' ? (
        <StatePanel
          error
          title={run.status === 'canceled' ? '任务已取消' : '生成失败'}
          description={run.error ?? '返回创作页调整描述后重新生成。'}
        >
          <Link to="/create" className={buttonClass({ variant: 'outline' })}>
            重新生成
          </Link>
        </StatePanel>
      ) : run.status !== 'succeeded' ? (
        <section className="panel py-16 text-center">
          <span className="spinner spinner-lg mb-6" aria-hidden />
          <p className="mb-5 text-[19px] font-semibold tracking-[-0.02em]">
            {run.stage || '正在准备画面'}
          </p>
          <div className="mx-auto max-w-sm">
            <ProgressBar value={run.progress} className="h-1.5" />
          </div>
          <p className="mt-4 text-[13px] text-muted tabular-nums">
            {run.progress}% · 可以离开此页，任务会继续执行
          </p>
        </section>
      ) : !run.candidates.length ? (
        <StatePanel title="没有生成候选图" description="请返回创作页重新生成。" />
      ) : (
        <>
          {run.prompt && (
            <p className="mb-8 rounded-card bg-paper px-6 py-5 text-[15px] leading-relaxed text-muted">
              <span className="mb-1 block text-xs font-medium text-faint">画面描述</span>
              {run.prompt}
            </p>
          )}
          {create.isError && (
            <p className="mb-4 text-danger" role="alert">
              {errorMessage(create.error)}
            </p>
          )}
          <div className="stagger grid gap-5 sm:grid-cols-2">
            {run.candidates.map((asset, index) => (
              <button
                type="button"
                key={asset.id}
                aria-pressed={picked === asset.id}
                onClick={() => setPicked(asset.id)}
                className={`lift relative overflow-hidden rounded-[22px] bg-paper text-left active:[transform:scale(0.985)] ${picked === asset.id ? 'shadow-[0_0_0_2px_var(--ink),0_12px_32px_rgb(0_0_0/0.1)]' : ''}`}
              >
                <span className="block overflow-hidden">
                  <img
                    src={asset.url}
                    alt={`候选图 ${index + 1}`}
                    className="zoom-media aspect-square w-full object-contain p-6"
                  />
                </span>
                {picked === asset.id && (
                  <span className="check-badge absolute top-4 right-4 size-8" aria-hidden>
                    <svg viewBox="0 0 16 16" fill="none" className="size-4">
                      <path
                        d="M3.5 8.2 6.4 11l6.1-6.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <span className="text-[15px] font-semibold">
                    方案 {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[13px] text-muted tabular-nums">
                    {picked === asset.id ? '已选择' : `${asset.width} × ${asset.height}`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
