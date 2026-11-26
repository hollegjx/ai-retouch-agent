import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Asset } from '@/types/assets'
import ImageDropzone from '@/components/ImageDropzone'
import { useCreateBatch, useBatches } from '@/hooks/useBatch'
import { errorMessage } from '@/utils/errors'
import { useAssetLibrary, useUploadAsset } from '@/hooks/useAssets'
import { formatDateTime } from '@/lib/format'
import { EMPTY_DRAFT, type BatchDraft, draftReady, operationsOf } from '@/lib/batch'
import PageHeading from '@/components/PageHeading'
import StatePanel from '@/components/ui/StatePanel'
import { Pipeline } from './Pipeline'

const MAX_IMAGES = 20

export function Compose() {
  const navigate = useNavigate()
  const create = useCreateBatch()
  const upload = useUploadAsset()
  const library = useAssetLibrary()
  const groups = library.data ?? []
  const batchHistory = useBatches()
  const history = batchHistory.data ?? []
  const [assets, setAssets] = useState<Asset[]>([])
  const [draft, setDraft] = useState<BatchDraft>(EMPTY_DRAFT)
  const blocked = draftReady(draft, assets.length)

  const add = (asset: Asset) =>
    setAssets((current) =>
      current.some((item) => item.id === asset.id) || current.length >= MAX_IMAGES
        ? current
        : [...current, asset],
    )

  const start = () => {
    if (blocked || create.isPending) return
    create.mutate(
      {
        asset_ids: assets.map((asset) => asset.id),
        operations: operationsOf(draft),
        formats: draft.formats,
      },
      { onSuccess: (run) => navigate(`/batch/${run.id}`) },
    )
  }

  return (
    <div className="page">
      <PageHeading title="批量处理" description="选择一组图片，配置处理步骤，一次完成重复工作。" />
      <div className="work-grid">
        <section className="panel">
          <h2 className="text-ink mb-3 text-sm font-medium">选择图片</h2>
          <ImageDropzone
            multiple
            maxFiles={MAX_IMAGES - assets.length}
            disabled={upload.isPending || assets.length >= MAX_IMAGES}
            hint={`JPG / PNG / WebP，最多 ${MAX_IMAGES} 张`}
            onFile={async (file) => add(await upload.mutateAsync(file))}
          />
          {assets.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {assets.map((asset) => (
                <li key={asset.id} className="relative">
                  <img
                    src={asset.url}
                    alt=""
                    className="border-line size-16 rounded-card border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAssets((current) => current.filter((item) => item.id !== asset.id))
                    }
                    className="bg-brand/70 absolute -top-1 -right-1 grid size-5 place-items-center rounded-full text-xs text-white"
                    aria-label="移除"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {library.isPending && (
            <div className="mt-4">
              <StatePanel title="正在读取历史素材" loading />
            </div>
          )}
          {library.isError && (
            <div className="mt-4">
              <StatePanel
                error
                title="历史素材加载失败"
                description={errorMessage(library.error)}
                onRetry={() => void library.refetch()}
              />
            </div>
          )}
          {groups.length > 0 && (
            <div className="mt-4">
              <p className="text-faint mb-2 text-xs">从历史素材添加</p>
              <ul className="flex flex-wrap gap-2">
                {groups
                  .flatMap((group) => group.assets)
                  .slice(0, 12)
                  .map((asset) => (
                    <li key={asset.id}>
                      <button
                        type="button"
                        aria-label={`添加素材 ${asset.width} × ${asset.height}`}
                        onClick={() => add(asset)}
                        className="block"
                      >
                        <img
                          src={asset.url}
                          alt=""
                          className="border-line size-14 rounded-card border object-cover hover:border-brand"
                        />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>

        <div className="panel">
          <Pipeline draft={draft} onChange={setDraft} />
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          disabled={Boolean(blocked) || create.isPending}
          onClick={start}
          className="bg-brand hover:bg-dark rounded-control px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {create.isPending ? '提交中…' : '开始处理'}
        </button>
        {blocked && <p className="text-faint text-xs">{blocked}</p>}
        {create.isError && <p className="text-danger text-xs">{errorMessage(create.error)}</p>}
      </div>

      {batchHistory.isPending && (
        <div className="mt-8">
          <StatePanel title="正在读取最近任务" loading />
        </div>
      )}
      {batchHistory.isError && (
        <div className="mt-8">
          <StatePanel
            error
            title="任务列表加载失败"
            description={errorMessage(batchHistory.error)}
            onRetry={() => void batchHistory.refetch()}
          />
        </div>
      )}
      {!batchHistory.isPending && !batchHistory.isError && !history.length && (
        <div className="mt-8">
          <StatePanel
            title="还没有批量任务"
            description="选择素材和处理步骤，创建你的第一个任务。"
          />
        </div>
      )}
      {history.length > 0 && (
        <section className="mt-12">
          <h2 className="text-ink mb-3 text-sm font-medium">最近任务</h2>
          <ul className="space-y-2">
            {history.map((item) => (
              <li key={item.run.id}>
                <Link
                  to={`/batch/${item.run.id}`}
                  className="border-line bg-paper hover:border-brand flex items-center justify-between rounded-card border px-4 py-3"
                >
                  <span className="text-ink text-sm">
                    {item.items.length} 张 · {item.run.stage || item.run.status}
                  </span>
                  <span className="text-faint text-xs tabular-nums">
                    {formatDateTime(item.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
