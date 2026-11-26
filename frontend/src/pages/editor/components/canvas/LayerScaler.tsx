import { canvasTheme } from '@/styles/canvasTheme'
import { useEffect, useRef } from 'react'
import type Konva from 'konva'
import { Transformer } from 'react-konva'
import type { Layer } from '@/types/sessions'
import { MIN_LAYER_SCALE, MAX_LAYER_SCALE, clampLayerScale } from './useLayerInteract'

export function LayerScaler({
  node,
  layer,
  viewScale,
  onScale,
  onHoldStage,
}: {
  node: Konva.Node
  layer: Layer
  viewScale: number
  onScale?: (layerId: string, scale: number, x: number, y: number) => void
  onHoldStage?: (held: boolean) => void
}) {
  const ref = useRef<Konva.Transformer>(null)
  const invert = 1 / viewScale

  useEffect(() => {
    const transformer = ref.current
    if (!transformer) return
    transformer.nodes([node])
    transformer.getLayer()?.batchDraw()
    return () => {
      transformer.nodes([])
    }
  }, [node])

  return (
    <Transformer
      ref={ref}
      rotateEnabled={false}
      flipEnabled={false}
      keepRatio
      enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
      ignoreStroke
      anchorSize={10 * invert}
      anchorCornerRadius={3 * invert}
      anchorStrokeWidth={1.5 * invert}
      borderStrokeWidth={invert}
      anchorStroke={canvasTheme.selection}
      borderStroke={canvasTheme.selection}
      boundBoxFunc={(oldBox, newBox) => {
        const min = MIN_LAYER_SCALE * Math.min(layer.width, layer.height)
        const max = MAX_LAYER_SCALE * Math.max(layer.width, layer.height)
        if (
          newBox.width < min ||
          newBox.height < min ||
          newBox.width > max ||
          newBox.height > max
        ) {
          return oldBox
        }
        return newBox
      }}
      onTransformStart={() => onHoldStage?.(true)}
      onTransformEnd={() => {
        const next = clampLayerScale((Math.abs(node.scaleX()) + Math.abs(node.scaleY())) / 2)
        const at = { x: node.x() - layer.width / 2, y: node.y() - layer.height / 2 }
        const still =
          Math.abs(next - Math.abs(layer.transform.scale_x)) < 0.001 &&
          Math.abs(at.x - layer.transform.x) < 0.5 &&
          Math.abs(at.y - layer.transform.y) < 0.5
        if (!still) onScale?.(layer.id, next, at.x, at.y)
        onHoldStage?.(false)
      }}
    />
  )
}
