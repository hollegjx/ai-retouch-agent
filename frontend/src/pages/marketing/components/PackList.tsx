import type { Asset } from '@/types/assets'
import type { SessionDetail } from '@/types/sessions'
import { KIND_LABELS, ratioLabel } from '@/lib/marketing'
import StatePanel from '@/components/ui/StatePanel'
import { SectionHead } from './Headings'

export function PackList({
  session,
  items,
  selected,
  disabled,
  packing,
  onToggle,
  onToggleAll,
  onDownload,
  error,
}: {
  session: SessionDetail
  items: Asset[]
  selected: string[]
  disabled: boolean
  packing: boolean
  onToggle: (id: string) => void
  onToggleAll: () => void
  onDownload: () => void
  error: string | null
}) {
  const allSelected = items.length > 0 && items.every((asset) => selected.includes(asset.id))

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <SectionHead title="打包下载" hint="选择需要交付的图片，下载为一个压缩包。" />
        <div className="flex shrink-0 items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={onToggleAll}
              className="border-line text-muted hover:text-ink rounded-control border px-3 py-2 text-xs font-medium disabled:opacity-40"
            >
              {allSelected ? '取消全选' : '全选'}
            </button>
          )}
          <button
            type="button"
            disabled={disabled || selected.length === 0}
            onClick={onDownload}
            className="bg-brand hover:bg-dark rounded-control px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
          >
            {packing ? '处理中…' : `打包 ${selected.length} 张`}
          </button>
        </div>
      </div>
      {error && <p className="text-danger mb-2 text-xs">{error}</p>}
      {items.length === 0 ? (
        <StatePanel
          title="还没有可交付的素材"
          description="先生成营销图或转换投放尺寸，结果会显示在这里。"
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((asset) => {
            const active = selected.includes(asset.id)
            return (
              <li key={asset.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggle(asset.id)}
                  aria-pressed={active}
                  className={`w-full overflow-hidden rounded-card border-2 text-left transition-colors ${
                    active
                      ? 'border-brand bg-brand-soft '
                      : 'border-line bg-paper hover:border-brand'
                  }`}
                >
                  <div className="bg-canvas relative aspect-square">
                    <img src={asset.url} alt="" className="size-full object-contain" />
                    <span
                      className={`absolute top-2 left-2 grid size-6 place-items-center rounded-full border-2 ${
                        active
                          ? 'border-brand bg-brand text-white'
                          : 'border-white/90 bg-brand/35 text-white/0'
                      }`}
                      aria-hidden
                    >
                      <CheckIcon />
                    </span>
                    <span className="bg-brand/70 absolute right-0 bottom-0 left-0 py-1 text-center text-xs text-white">
                      {KIND_LABELS[asset.kind]} · {ratioLabel(asset.width, asset.height)}
                    </span>
                  </div>
                  <p
                    className={`px-3 py-2 text-xs tabular-nums ${
                      active ? 'text-brand-strong' : 'text-muted'
                    }`}
                  >
                    {asset.width} × {asset.height}
                    {asset.id === session.current_asset_id ? ' · 当前' : ''}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5" aria-hidden>
      <path
        d="M3.5 8.2 6.4 11l6.1-6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
