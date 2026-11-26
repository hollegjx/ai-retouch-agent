import { canvasTheme } from '@/styles/canvasTheme'
import { useEffect, useRef, useState } from 'react'
import type { Layer } from '@/types/sessions'

export function TextEditor({
  layer,
  view,
  onCommit,
  onCancel,
}: {
  layer: Layer
  view: { scale: number; x: number; y: number }
  onCommit: (text: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(layer.text || '')
  const ref = useRef<HTMLTextAreaElement>(null)
  const done = useRef(false)
  const scale = Math.abs(layer.transform.scale_x) * view.scale
  const width = Math.max(48, layer.width * scale)
  const height = Math.max(28, layer.height * scale)
  const fontSize = Math.max(12, (layer.font_size ?? 24) * scale)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const finish = (next: string | null) => {
    if (done.current) return
    done.current = true
    if (next === null) onCancel()
    else onCommit(next)
  }

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          finish(value)
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          finish(null)
        }
      }}
      className="border-brand bg-paper text-ink absolute z-10 resize-none border px-1 py-1 outline-none"
      style={{
        left: view.x + layer.transform.x * view.scale,
        top: view.y + layer.transform.y * view.scale,
        width,
        height,
        fontSize,
        color: layer.fill ?? canvasTheme.ink,
        lineHeight: `${height}px`,
        textAlign: 'center',
        transform: layer.transform.rotation ? `rotate(${layer.transform.rotation}deg)` : undefined,
        transformOrigin: 'center center',
      }}
    />
  )
}
