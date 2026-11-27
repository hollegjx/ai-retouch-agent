import type { Asset } from '@/types/assets'
import type { SessionDetail } from '@/types/sessions'
import { KIND_LABELS, ratioLabel } from '@/lib/marketing'
import StatePanel from '@/components/ui/StatePanel'
import { buttonClass } from '@/components/ui/buttonStyles'
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
      <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
        <SectionHead title="打包下载" hint="选择需要交付的图片，下载为一个压缩包。" />
        <div className="flex shrink-0 items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={onToggleAll}
              className={buttonClass({ variant: 'outline', size: 'sm' })}
            >
              {allSelected ? '取消全选' : '全选'}
            </button>
          )}
          <button
            type="button"
            disabled={disabled || selected.length === 0}
            onClick={onDownload}
            className={buttonClass({ variant: 'solid', size: 'sm' })}
          >
            {packing ? '处理中…' : `打包 ${selected.length} 张`}
          </button>
        </div>
      </div>
      {error && <p className="text-danger animate-fade-in mb-3 text-sm">{error}</p>}
      {items.length === 0 ? (
        <StatePanel
          title="还没有可交付的素材"
          description="先生成营销图或转换投放尺寸，结果会显示在这里。"
        />
      ) : (
        <ul className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((asset) => {
            const active = selected.includes(asset.id)
            return (
              <li key={asset.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggle(asset.id)}
                  aria-pressed={active}
                  className={`lift bg-paper w-full overflow-hidden rounded-[18px] text-left active:[transform:scale(0.985)] ${
                    active ? 'shadow-[0_0_0_2px_var(--ink)]' : ''
                  }`}
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img src={asset.url} alt="" className="zoom-media size-full object-contain" />
                    <span
                      className={`absolute top-3 left-3 grid size-6 place-items-center rounded-full transition-[background-color,box-shadow,color] duration-300 ${
                        active
                          ? 'bg-ink text-white'
                          : 'bg-white/70 text-transparent shadow-[inset_0_0_0_1.5px_rgb(0_0_0/0.25)] backdrop-blur'
                      }`}
                      aria-hidden
                    >
                      {active && (
                        <span className="check-badge size-6">
                          <CheckIcon />
                        </span>
                      )}
                    </span>
                    <span className="absolute bottom-3 left-3 rounded-full bg-[rgb(29_29_31/0.72)] px-2.5 py-1 text-xs text-white backdrop-blur">
                      {KIND_LABELS[asset.kind]} · {ratioLabel(asset.width, asset.height)}
                    </span>
                  </div>
                  <p
                    className={`px-4 py-3 text-[13px] tabular-nums ${
                      active ? 'text-ink font-medium' : 'text-muted'
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
