import { useState } from 'react'

export function SliderField({
  label,
  value,
  origin,
  min,
  max,
  step,
  format,
  disabled,
  onInput,
  onCommit,
}: {
  label: string
  value: number
  origin: number
  min: number
  max: number
  step: number
  format: (value: number) => string
  disabled: boolean
  onInput: (value: number) => void
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState<number | null>(null)

  const commit = () => {
    if (draft !== null && draft !== value) onCommit(draft)
    setDraft(null)
  }

  return (
    <label
      className="block select-none"
      title="双击复位"
      onDoubleClick={() => {
        setDraft(null)
        if (!disabled && value !== origin) onCommit(origin)
      }}
    >
      <span className="mb-1 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="text-ink tabular-nums">{format(draft ?? value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={draft ?? value}
        onChange={(event) => {
          const next = Number(event.target.value)
          setDraft(next)
          onInput(next)
        }}
        onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
        onKeyUp={(event) => {
          if (
            [
              'ArrowLeft',
              'ArrowRight',
              'ArrowUp',
              'ArrowDown',
              'Home',
              'End',
              'PageUp',
              'PageDown',
            ].includes(event.key)
          )
            commit()
        }}
        onBlur={commit}
        onPointerUp={commit}
        onLostPointerCapture={commit}
      />
    </label>
  )
}
