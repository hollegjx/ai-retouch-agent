import { Link } from 'react-router-dom'
import { isTerminal } from '@/lib/runs'
import ProgressBar from '@/components/ui/ProgressBar'
import { useBatch, useExportBatch } from '@/hooks/useBatch'
import { errorMessage } from '@/utils/errors'
import PageHeading from '@/components/PageHeading'
import StatePanel from '@/components/ui/StatePanel'
import { buttonClass } from '@/components/ui/buttonStyles'
import { saveDownload } from '@/utils/download'
import { toast } from '@/stores/toasts'

export function Watch({ runId }: { runId: string }) {
  const { data, live, isError, error, refetch } = useBatch(runId)
  const pack = useExportBatch(runId)
  const done = live.status && isTerminal(live.status)
  const succeeded = data?.items.filter((item) => item.status === 'succeeded').length ?? 0

  const download = () =>
    !pack.isPending &&
    pack.mutate(undefined, {
      onSuccess: ({ blob, filename }) => {
        saveDownload(blob, filename)
        toast(`已打包 ${succeeded} 张`)
      },
    })

  if (!data)
    return (
      <div className="page">
        <PageHeading title="批量任务" />
        <StatePanel
          title={isError ? '任务加载失败' : '正在读取任务'}
          error={isError}
          loading={!isError}
          description={isError ? errorMessage(error) : undefined}
          onRetry={isError ? () => void refetch() : undefined}
        />
      </div>
    )

  return (
    <div className="page">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-ink text-[clamp(32px,3.6vw,48px)] leading-[1.08] font-bold tracking-[-0.035em]">
            批量进度
          </h1>
          <p className="text-muted mt-3 text-[17px] tabular-nums">
            {live.stage || '处理中'}
            {done ? '' : ` · ${live.progress}%`}
          </p>
          {!done && <ProgressBar value={live.progress} className="mt-4 h-1.5 w-72 max-w-full" />}
        </div>
        <div className="flex items-center gap-2">
          <Link to="/batch" className={buttonClass({ variant: 'outline' })}>
            新任务
          </Link>
          <button
            type="button"
            disabled={!done || succeeded === 0 || pack.isPending}
            onClick={download}
            className={buttonClass({ variant: 'solid' })}
          >
            {pack.isPending ? '打包中…' : '打包下载'}
          </button>
        </div>
      </div>

      {live.error && <p className="text-danger mb-3 text-sm">{live.error}</p>}
      {pack.isError && <p className="text-danger mb-3 text-sm">{errorMessage(pack.error)}</p>}

      <ul className="stagger space-y-3">
        {(data?.items ?? []).map((item) => (
          <li key={item.source.id} className="bg-paper flex items-center gap-5 rounded-[20px] p-4">
            <img
              src={item.source.url}
              alt=""
              className="bg-soft size-16 shrink-0 rounded-[14px] object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="text-ink flex items-center gap-2 text-[15px] font-medium">
                <StatusDot status={item.status} />
                {statusLabel(item.status)}
              </p>
              {item.error && <p className="text-danger mt-1 text-xs">{item.error}</p>}
              <p className="text-muted mt-1 text-[13px] tabular-nums">
                {item.source.width} × {item.source.height}
                {item.outputs.length ? ` → ${item.outputs.length} 张结果` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.outputs.slice(0, 4).map((output) => (
                <img
                  key={output.id}
                  src={output.url}
                  alt=""
                  className="animate-pop bg-soft size-12 rounded-[12px] object-cover"
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  if (status === 'running') return <span className="spinner size-3.5 border-[1.5px]" aria-hidden />
  return (
    <span
      aria-hidden
      className={`size-2 rounded-full ${
        status === 'succeeded' ? 'bg-ink' : status === 'failed' ? 'bg-danger' : 'bg-line-strong'
      }`}
    />
  )
}

function statusLabel(status: string) {
  if (status === 'succeeded') return '已完成'
  if (status === 'failed') return '失败'
  if (status === 'running') return '处理中'
  return '等待中'
}
