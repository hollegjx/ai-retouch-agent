import { Link } from 'react-router-dom'
import { isTerminal } from '@/lib/runs'
import ProgressBar from '@/components/ui/ProgressBar'
import { useBatch, useExportBatch } from '@/hooks/useBatch'
import { errorMessage } from '@/utils/errors'
import PageHeading from '@/components/PageHeading'
import StatePanel from '@/components/ui/StatePanel'
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
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-ink text-[28px] font-semibold tracking-tight">批量进度</h1>
          <p className="text-muted mt-1 text-sm">
            {live.stage || '处理中'}
            {done ? '' : ` · ${live.progress}%`}
          </p>
          {!done && <ProgressBar value={live.progress} className="mt-2 h-0.5 w-64 rounded-full" />}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/batch"
            className="border-line text-muted hover:text-ink rounded-control border px-3 py-2 text-xs font-medium"
          >
            新任务
          </Link>
          <button
            type="button"
            disabled={!done || succeeded === 0 || pack.isPending}
            onClick={download}
            className="bg-brand hover:bg-dark rounded-control px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
          >
            {pack.isPending ? '打包中…' : '打包下载'}
          </button>
        </div>
      </div>

      {live.error && <p className="text-danger mb-3 text-sm">{live.error}</p>}
      {pack.isError && <p className="text-danger mb-3 text-sm">{errorMessage(pack.error)}</p>}

      <ul className="space-y-3">
        {(data?.items ?? []).map((item) => (
          <li
            key={item.source.id}
            className="border-line bg-paper flex items-center gap-4 rounded-card border p-3"
          >
            <img
              src={item.source.url}
              alt=""
              className="bg-canvas size-16 shrink-0 rounded-card object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="text-ink text-sm">{statusLabel(item.status)}</p>
              {item.error && <p className="text-danger mt-1 text-xs">{item.error}</p>}
              <p className="text-faint mt-1 text-xs tabular-nums">
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
                  className="border-line size-12 rounded-card border object-cover"
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function statusLabel(status: string) {
  if (status === 'succeeded') return '已完成'
  if (status === 'failed') return '失败'
  if (status === 'running') return '处理中'
  return '等待中'
}
