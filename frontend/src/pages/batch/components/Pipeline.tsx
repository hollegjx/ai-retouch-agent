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
      <h2 className="text-ink mb-4 text-[19px] font-semibold tracking-[-0.022em]">处理步骤</h2>
      <ul className="grid gap-2">
        {BATCH_STEPS.map((step) => {
          const on = draft.selected.includes(step.id)
          return (
            <li
              key={step.id}
              className={`rounded-[16px] p-4 transition-[background-color,box-shadow] duration-300 ease-soft ${
                on ? 'bg-paper shadow-[0_0_0_1.5px_var(--ink)]' : 'bg-soft hover:bg-[#ededf0]'
              }`}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(step.id)}
                  className="mt-1"
                />
                <span>
                  <span className="text-ink block text-[15px] font-medium">{step.label}</span>
                  <span className="text-muted mt-0.5 block text-[13px]">{step.hint}</span>
                </span>
              </label>
              {on && step.id === 'replace_background' && (
                <input
                  value={draft.prompt}
                  onChange={(event) => onChange({ ...draft, prompt: event.target.value })}
                  aria-label="批量背景描述"
                  placeholder="例如：浅木色桌面，晨光"
                  className="form-field form-field-sm animate-fade-in mt-3"
                />
              )}
              {on && step.id === 'adjust_image' && (
                <div className="animate-fade-in mt-3 grid grid-cols-3 gap-3">
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
                <div className="animate-fade-in mt-3 flex gap-2">
                  {([2, 4] as const).map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => onChange({ ...draft, scale })}
                      className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${
                        draft.scale === scale
                          ? 'bg-ink text-white'
                          : 'text-ink bg-black/[0.05] hover:bg-black/[0.09]'
                      }`}
                    >
                      {scale} 倍
                    </button>
                  ))}
                </div>
              )}
              {on && step.id === 'expand_canvas' && (
                <div className="animate-fade-in mt-3 flex flex-wrap gap-2">
                  {EXPAND_RATIOS.map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => onChange({ ...draft, expandRatio: ratio })}
                      className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${
                        draft.expandRatio === ratio
                          ? 'bg-ink text-white'
                          : 'text-ink bg-black/[0.05] hover:bg-black/[0.09]'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              )}
              {on && step.id === 'prepare_delivery_sizes' && (
                <div className="animate-fade-in mt-3 flex flex-wrap gap-2">
                  {(['1:1', '4:5', '9:16'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => toggleDelivery(ratio)}
                      className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${
                        draft.delivery.includes(ratio)
                          ? 'bg-ink text-white'
                          : 'text-ink bg-black/[0.05] hover:bg-black/[0.09]'
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

      <div className="mt-5 flex items-center gap-4">
        <span className="text-muted text-[13px]">导出格式</span>
        {(['png', 'jpg'] as const).map((fmt) => (
          <label key={fmt} className="text-ink flex items-center gap-2 text-[13px] font-medium">
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
    <label className="text-muted block text-xs">
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
