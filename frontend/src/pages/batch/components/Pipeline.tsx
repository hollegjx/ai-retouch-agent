import type { BatchTool } from '@/types/batches'
import { BATCH_STEPS, EXPAND_RATIOS, type BatchDraft } from '@/lib/batch'

export function Pipeline({
  draft,
  onChange,
}: {
  draft: BatchDraft
  onChange: (draft: BatchDraft) => void
}) {
  const toggle = (id: BatchTool) => {
    const selected = draft.selected.includes(id)
      ? draft.selected.filter((item) => item !== id)
      : [...draft.selected, id]
    onChange({ ...draft, selected })
  }

  const toggleFormat = (fmt: 'png' | 'jpg') => {
    const formats = draft.formats.includes(fmt)
      ? draft.formats.filter((item) => item !== fmt)
      : [...draft.formats, fmt]
    onChange({ ...draft, formats })
  }

  const toggleDelivery = (ratio: '1:1' | '4:5' | '9:16') => {
    const delivery = draft.delivery.includes(ratio)
      ? draft.delivery.filter((item) => item !== ratio)
      : [...draft.delivery, ratio]
    onChange({ ...draft, delivery })
  }

  return (
    <section>
      <h2 className="text-ink mb-3 text-sm font-medium">处理步骤</h2>
      <ul className="grid gap-3">
        {BATCH_STEPS.map((step) => {
          const on = draft.selected.includes(step.id)
          return (
            <li key={step.id} className="border-line bg-paper rounded-card border p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(step.id)}
                  className="mt-1"
                />
                <span>
                  <span className="text-ink block text-sm font-medium">{step.label}</span>
                  <span className="text-faint block text-xs">{step.hint}</span>
                </span>
              </label>
              {on && step.id === 'replace_background' && (
                <input
                  value={draft.prompt}
                  onChange={(event) => onChange({ ...draft, prompt: event.target.value })}
                  aria-label="批量背景描述"
                  placeholder="例如：浅木色桌面，晨光"
                  className="border-line mt-3 w-full rounded-card border px-3 py-2 text-xs outline-none"
                />
              )}
              {on && step.id === 'adjust_image' && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Slider
                    label="亮度"
                    value={draft.brightness}
                    onChange={(brightness) => onChange({ ...draft, brightness })}
                  />
                  <Slider
                    label="对比"
                    value={draft.contrast}
                    onChange={(contrast) => onChange({ ...draft, contrast })}
                  />
                  <Slider
                    label="饱和"
                    value={draft.saturation}
                    onChange={(saturation) => onChange({ ...draft, saturation })}
                  />
                </div>
              )}
              {on && step.id === 'upscale_image' && (
                <div className="mt-3 flex gap-2">
                  {([2, 4] as const).map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => onChange({ ...draft, scale })}
                      className={`rounded-control px-3 py-2 text-xs ${
                        draft.scale === scale
                          ? 'bg-brand text-white'
                          : 'border-line text-muted border'
                      }`}
                    >
                      {scale} 倍
                    </button>
                  ))}
                </div>
              )}
              {on && step.id === 'expand_canvas' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {EXPAND_RATIOS.map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => onChange({ ...draft, expandRatio: ratio })}
                      className={`rounded-control px-3 py-2 text-xs ${
                        draft.expandRatio === ratio
                          ? 'bg-brand text-white'
                          : 'border-line text-muted border'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              )}
              {on && step.id === 'prepare_delivery_sizes' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['1:1', '4:5', '9:16'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => toggleDelivery(ratio)}
                      className={`rounded-control px-3 py-2 text-xs ${
                        draft.delivery.includes(ratio)
                          ? 'bg-brand text-white'
                          : 'border-line text-muted border'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-muted text-xs">导出格式</span>
        {(['png', 'jpg'] as const).map((fmt) => (
          <label key={fmt} className="text-ink flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={draft.formats.includes(fmt)}
              onChange={() => toggleFormat(fmt)}
            />
            {fmt.toUpperCase()}
          </label>
        ))}
      </div>
    </section>
  )
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="text-faint block text-xs">
      {label}
      <input
        type="range"
        min={-1}
        max={1}
        step={0.05}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full"
      />
    </label>
  )
}
