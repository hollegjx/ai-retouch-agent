import { canvasTheme } from '@/styles/canvasTheme'
import { useState } from 'react'
import type { Layer } from '@/types/sessions'
import { useEditorUi } from '@/stores/editorUi'
import { SliderField } from './SliderField'

const TEXT_FIELD =
  'border-line text-ink placeholder:text-faint rounded-control focus:border-line-strong w-full resize-none border px-3 py-2 text-xs leading-relaxed outline-none'

function toHex6(value: string) {
  const raw = value.replace('#', '')
  if (raw.length === 3) return `#${[...raw].map((ch) => ch + ch).join('')}`
  return `#${raw.padEnd(6, '0')}`.slice(0, 7)
}

export function TextForm({
  layer,
  disabled,
  onCommit,
}: {
  layer: Layer
  disabled: boolean
  onCommit: (params: { text: string; font_size: number; fill: string }) => void
}) {
  const [text, setText] = useState(layer.text || '')
  const [fontSize, setFontSize] = useState(layer.font_size ?? 24)
  const [fill, setFill] = useState(toHex6(layer.fill ?? canvasTheme.ink))
  const setLayerPreview = useEditorUi((state) => state.setLayerPreview)

  const current = {
    text: layer.text || '',
    font_size: layer.font_size ?? 24,
    fill: toHex6(layer.fill ?? canvasTheme.ink),
  }

  const commit = (next: { text: string; font_size: number; fill: string }) => {
    if (
      next.text === current.text &&
      next.font_size === current.font_size &&
      next.fill.toLowerCase() === current.fill.toLowerCase()
    ) {
      return
    }
    onCommit(next)
  }

  return (
    <div className="space-y-3">
      <textarea
        aria-label="图层文字"
        rows={3}
        value={text}
        disabled={disabled}
        className={TEXT_FIELD}
        onChange={(event) => {
          const next = event.target.value
          setText(next)
          setLayerPreview({ id: layer.id, text: next })
        }}
        onBlur={() => commit({ text, font_size: fontSize, fill })}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault()
            commit({ text, font_size: fontSize, fill })
          }
        }}
      />
      <SliderField
        label="字号"
        value={fontSize}
        origin={layer.font_size ?? 24}
        min={8}
        max={120}
        step={1}
        format={(value) => `${Math.round(value)}`}
        disabled={disabled}
        onInput={(value) => {
          setFontSize(value)
          setLayerPreview({ id: layer.id, font_size: value })
        }}
        onCommit={(value) => {
          setFontSize(value)
          commit({ text, font_size: value, fill })
        }}
      />
      <label className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted">颜色</span>
        <input
          type="color"
          value={fill}
          disabled={disabled}
          className="border-line h-7 w-12 cursor-pointer rounded border bg-transparent p-0"
          onChange={(event) => {
            const next = event.target.value
            setFill(next)
            setLayerPreview({ id: layer.id, fill: next })
            commit({ text, font_size: fontSize, fill: next })
          }}
        />
      </label>
    </div>
  )
}
