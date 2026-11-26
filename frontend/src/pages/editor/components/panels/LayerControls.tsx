import { canvasTheme } from '@/styles/canvasTheme'
import { useEffect } from 'react'
import type { Layer } from '@/types/sessions'
import Button from '@/components/ui/Button'
import { useEditorUi } from '@/stores/editorUi'
import { SliderField } from './SliderField'

const REORDER_LABELS = {
  top: '置顶',
  up: '上移',
  down: '下移',
  bottom: '置底',
} as const

export function LayerControls({
  layer,
  disabled,
  onOpacity,
  onScale,
  onRotate,
  onReorder,
}: {
  layer: Layer
  disabled: boolean
  onOpacity: (value: number) => void
  onScale: (value: number) => void
  onRotate: (value: number) => void
  onReorder: (place: 'top' | 'bottom' | 'up' | 'down') => void
}) {
  const preview = useEditorUi((state) => state.layerPreview)
  const setLayerPreview = useEditorUi((state) => state.setLayerPreview)
  const scale = Math.abs(layer.transform.scale_x)

  // 文档追上预览后再撤，避免选中/回写过程把图层拽回原位
  useEffect(() => {
    if (!preview || preview.id !== layer.id) return
    const same =
      (preview.opacity === undefined || preview.opacity === layer.opacity) &&
      (preview.scale === undefined || Math.abs(preview.scale - scale) < 0.001) &&
      (preview.rotation === undefined || preview.rotation === layer.transform.rotation) &&
      (preview.x === undefined || Math.abs(preview.x - layer.transform.x) < 0.5) &&
      (preview.y === undefined || Math.abs(preview.y - layer.transform.y) < 0.5) &&
      (preview.text === undefined || preview.text === (layer.text || '')) &&
      (preview.font_size === undefined || preview.font_size === (layer.font_size ?? 24)) &&
      (preview.fill === undefined ||
        preview.fill.toLowerCase() === (layer.fill ?? canvasTheme.ink).toLowerCase())
    if (same) setLayerPreview(null)
  }, [
    preview,
    scale,
    setLayerPreview,
    layer.id,
    layer.opacity,
    layer.text,
    layer.font_size,
    layer.fill,
    layer.transform.scale_x,
    layer.transform.rotation,
    layer.transform.x,
    layer.transform.y,
  ])

  useEffect(() => () => setLayerPreview(null), [setLayerPreview])

  return (
    <div className="space-y-3">
      <SliderField
        label="透明度"
        value={layer.opacity}
        origin={1}
        min={0}
        max={1}
        step={0.01}
        format={(value) => `${Math.round(value * 100)}%`}
        disabled={disabled}
        onInput={(opacity) => setLayerPreview({ id: layer.id, opacity })}
        onCommit={onOpacity}
      />
      <SliderField
        label="图层缩放"
        value={scale}
        origin={1}
        min={0.1}
        max={3}
        step={0.05}
        format={(value) => `${Math.round(value * 100)}%`}
        disabled={disabled}
        onInput={(value) => setLayerPreview({ id: layer.id, scale: value })}
        onCommit={onScale}
      />
      <SliderField
        label="旋转"
        value={layer.transform.rotation}
        origin={0}
        min={-180}
        max={180}
        step={1}
        format={(value) => `${Math.round(value)}°`}
        disabled={disabled}
        onInput={(rotation) => setLayerPreview({ id: layer.id, rotation })}
        onCommit={onRotate}
      />
      <div className="grid grid-cols-4 gap-1">
        {(['top', 'up', 'down', 'bottom'] as const).map((place) => (
          <Button
            key={place}
            variant="outline"
            size="sm"
            block
            disabled={disabled}
            onClick={() => onReorder(place)}
          >
            {REORDER_LABELS[place]}
          </Button>
        ))}
      </div>
    </div>
  )
}
