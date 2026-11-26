import type { Asset } from '@/types/assets'
import type { Layer } from '@/types/sessions'
import Button from '@/components/ui/Button'

export function LayerRow({
  layer,
  active,
  disabled,
  thumb,
  onSelect,
  onToggleVisible,
}: {
  layer: Layer
  active: boolean
  disabled: boolean
  thumb?: Asset
  onSelect: () => void
  onToggleVisible: () => void
}) {
  return (
    <li
      className={`rounded-control flex items-center border transition-all duration-[160ms] ${
        active ? 'border-brand bg-brand-soft' : 'border-line hover:border-line-strong hover:bg-soft'
      } ${layer.visible ? '' : 'opacity-50'}`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left"
      >
        <span className="bg-canvas border-line rounded-chip size-8 shrink-0 overflow-hidden border">
          {thumb ? (
            <img src={thumb.url} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-faint grid size-full place-items-center text-xs">
              {layer.kind === 'text' ? '文' : ''}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-ink block truncate text-xs font-medium">{layer.name}</span>
          <span className="text-faint block truncate text-xs">
            {layer.kind === 'text' ? layer.text || '文字' : layer.locked ? '已锁定' : '图像'}
          </span>
        </span>
        <span className="text-faint shrink-0 text-xs tabular-nums">
          {Math.round(layer.opacity * 100)}%
        </span>
      </button>
      <Button
        variant="icon"
        size="sm"
        disabled={disabled}
        title={layer.visible ? '隐藏图层' : '显示图层'}
        onClick={onToggleVisible}
        className="mr-2 shrink-0"
      >
        <EyeIcon open={layer.visible} />
      </Button>
    </li>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {open ? (
        <circle cx="8" cy="8" r="1.7" fill="currentColor" />
      ) : (
        <path d="M3 13 13 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      )}
    </svg>
  )
}
