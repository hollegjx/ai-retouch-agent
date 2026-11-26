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
        <section className="panel py-12 text-center">
          <p className="mb-4 text-base font-medium">{run.stage || '正在准备画面'}</p>
          <div className="mx-auto max-w-sm">
            <ProgressBar value={run.progress} className="h-2 rounded-full" />
          </div>
          <p className="mt-4 text-xs text-muted">{run.progress}% · 可以离开此页，任务会继续执行</p>
        </section>
      ) : !run.candidates.length ? (
        <StatePanel title="没有生成候选图" description="请返回创作页重新生成。" />
      ) : (
        <>
          {run.prompt && (
            <p className="mb-6 rounded-card border border-line bg-paper p-4 text-muted leading-relaxed">
              {run.prompt}
            </p>
          )}
          {create.isError && (
            <p className="mb-4 text-danger" role="alert">
              {errorMessage(create.error)}
            </p>
          )}
          <div className="grid gap-6 sm:grid-cols-2">
            {run.candidates.map((asset, index) => (
              <button
                type="button"
                key={asset.id}
                aria-pressed={picked === asset.id}
                onClick={() => setPicked(asset.id)}
                className={`overflow-hidden rounded-card border bg-paper text-left ${picked === asset.id ? 'border-brand' : 'border-line'}`}
              >
                <img
                  src={asset.url}
                  alt={`候选图 ${index + 1}`}
                  className="aspect-square w-full bg-soft object-contain p-4"
                />
                <div className="flex items-center justify-between gap-4 border-t border-line p-4">
                  <span className="font-medium">方案 {String(index + 1).padStart(2, '0')}</span>
                  <span className="text-xs text-muted">
                    {picked === asset.id ? '已选择 ✓' : `${asset.width} × ${asset.height}`}
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
