import type { Asset, AssetKind } from '@/types/assets'

const KIND_LABELS: Record<AssetKind, string> = {
  original: '原图',
  generated: '生成',
  subject: '主体',
  background: '背景',
  mask: '遮罩',
  marketing: '营销',
  export: '导出',
}

/** 会话内全部图片，含未采用的候选。点击切换画布当前图，不覆盖任何已有结果。 */
export default function ImageWall({
  assets,
  currentId,
  disabled,
  onPick,
}: {
  assets: Asset[]
  currentId: string
  disabled: boolean
  onPick: (assetId: string) => void
}) {
  return (
    <div className="bg-paper shrink-0 border-t border-[var(--hairline)]">
      <div className="scrollbar-slim flex scroll-px-4 items-center gap-3 overflow-x-auto px-4 py-3">
        {assets
          .filter((asset) => asset.kind !== 'mask')
          .filter(
            (asset) =>
              asset.id === currentId || (asset.kind !== 'subject' && asset.kind !== 'background'),
          )
          .map((asset) => {
            const active = asset.id === currentId
            return (
              <button
                key={asset.id}
                type="button"
                disabled={disabled || active}
                onClick={() => onPick(asset.id)}
                title={
                  active
                    ? `当前画布 · ${KIND_LABELS[asset.kind]}`
                    : `采用这张 · ${KIND_LABELS[asset.kind]} ${asset.width}×${asset.height}`
                }
                className={`bg-soft group animate-pop relative size-16 shrink-0 overflow-hidden rounded-[14px] transition-[box-shadow,transform] duration-300 ease-soft disabled:cursor-default ${
                  active
                    ? 'shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ink)]'
                    : 'hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgb(0_0_0/0.12)]'
                }`}
              >
                <img
                  src={asset.url}
                  alt=""
                  loading="lazy"
                  className="size-full object-contain transition-transform duration-500 ease-soft group-hover:scale-105"
                />
                <span className="absolute right-1 bottom-1 left-1 rounded-full bg-[rgb(29_29_31/0.72)] py-0.5 text-center text-[11px] text-white backdrop-blur">
                  {KIND_LABELS[asset.kind]}
                </span>
              </button>
            )
          })}
      </div>
    </div>
  )
}
