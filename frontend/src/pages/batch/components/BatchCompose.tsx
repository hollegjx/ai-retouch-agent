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
import { buttonClass } from '@/components/ui/buttonStyles'
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
          <h2 className="text-ink mb-4 text-[19px] font-semibold tracking-[-0.022em]">选择图片</h2>
          <ImageDropzone
            multiple
            maxFiles={MAX_IMAGES - assets.length}
            disabled={upload.isPending || assets.length >= MAX_IMAGES}
            hint={`JPG / PNG / WebP，最多 ${MAX_IMAGES} 张`}
            onFile={async (file) => add(await upload.mutateAsync(file))}
          />
          {assets.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-3">
              {assets.map((asset) => (
                <li key={asset.id} className="animate-pop relative">
                  <img
                    src={asset.url}
                    alt=""
                    className="bg-soft size-16 rounded-[14px] object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAssets((current) => current.filter((item) => item.id !== asset.id))
                    }
                    className="bg-ink absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full text-xs text-white shadow-[0_0_0_2px_#fff] hover:scale-110"
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
            <div className="mt-6">
              <p className="text-muted mb-3 text-[13px]">从历史素材添加</p>
              <ul className="stagger flex flex-wrap gap-2">
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
                          className="bg-soft size-14 rounded-[12px] object-cover transition-[transform,box-shadow] duration-300 ease-soft hover:scale-105 hover:shadow-[0_0_0_2px_var(--ink)]"
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

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={Boolean(blocked) || create.isPending}
          onClick={start}
          className={buttonClass({ variant: 'solid' })}
        >
          {create.isPending ? '提交中…' : '开始处理'}
        </button>
        {blocked && <p className="text-muted text-[13px]">{blocked}</p>}
        {create.isError && <p className="text-danger text-[13px]">{errorMessage(create.error)}</p>}
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
        <section className="mt-14">
          <h2 className="text-ink mb-4 text-[19px] font-semibold tracking-[-0.022em]">最近任务</h2>
          <ul className="stagger space-y-2">
            {history.map((item) => (
              <li key={item.run.id}>
                <Link
                  to={`/batch/${item.run.id}`}
                  className="lift bg-paper flex items-center justify-between rounded-[16px] px-5 py-4"
                >
                  <span className="text-ink text-[15px] font-medium">
                    {item.items.length} 张 · {item.run.stage || item.run.status}
                  </span>
                  <span className="text-muted text-[13px] tabular-nums">
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
