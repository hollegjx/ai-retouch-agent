import { useEffect, useRef, useState } from 'react'
import type Konva from 'konva'
import type { Layer } from '@/types/sessions'
import { type LayerPreview } from '@/stores/editorUi'

type Drop = { x: number; y: number }

/** 拖角写入服务端期间钉住的缩放与位置，两者必须成对，否则画面会错位。 */
export type Pinned = { id: string; scale: number; x: number; y: number }

export function transformStamp(layer: Layer) {
  const { x, y, scale_x, scale_y } = layer.transform
  return `${layer.id}:${x},${y},${scale_x},${scale_y}`
}

export function samePinned(layer: Layer, pinned: Pinned) {
  const { x, y, scale_x } = layer.transform
  return (
    Math.abs(Math.abs(scale_x) - pinned.scale) < 0.001 &&
    Math.abs(x - pinned.x) < 0.5 &&
    Math.abs(y - pinned.y) < 0.5
  )
}

export function layerPoint(
  layer: Layer,
  preview: LayerPreview | null,
  drop: Drop | null,
  pinned: Pinned | null,
) {
  return {
    x: (drop?.x ?? pinned?.x ?? preview?.x ?? layer.transform.x) + layer.width / 2,
    y: (drop?.y ?? pinned?.y ?? preview?.y ?? layer.transform.y) + layer.height / 2,
  }
}

export function layerScale(layer: Layer, preview: LayerPreview | null, pinned: Pinned | null) {
  const magnitude = pinned?.scale ?? preview?.scale ?? Math.abs(layer.transform.scale_x)
  return {
    x: (Math.sign(layer.transform.scale_x) || 1) * magnitude,
    y: (Math.sign(layer.transform.scale_y) || 1) * magnitude,
  }
}

export const MIN_LAYER_SCALE = 0.1

export const MAX_LAYER_SCALE = 8

export function clampLayerScale(value: number) {
  return Math.min(MAX_LAYER_SCALE, Math.max(MIN_LAYER_SCALE, value))
}

export function useLayerInteract(
  layer: Layer,
  interactive: boolean,
  stageDraggable: boolean,
  onSelect?: (id: string) => void,
  onMove?: (layerId: string, x: number, y: number) => void,
  onHoldStage?: (held: boolean) => void,
) {
  const [drop, setDrop] = useState<Drop | null>(null)
  const dragged = useRef(false)
  const movable = interactive && !layer.locked

  useEffect(() => {
    if (!drop) return
    if (Math.abs(layer.transform.x - drop.x) < 0.5 && Math.abs(layer.transform.y - drop.y) < 0.5) {
      // oxlint-disable-next-line react/set-state-in-effect -- 服务端确认拖动位置后释放 Konva 临时位置
      setDrop(null)
    }
  }, [layer.transform.x, layer.transform.y, drop])

  const restoreStage = (node: Konva.Node) => {
    node.getStage()?.draggable(stageDraggable)
  }

  const pick = () => {
    if (dragged.current) {
      dragged.current = false
      return
    }
    onSelect?.(layer.id)
  }

  return {
    drop,
    handlers: {
      listening: interactive,
      draggable: movable,
      dragDistance: 2,
      onMouseDown: (event: Konva.KonvaEventObject<MouseEvent>) => {
        event.cancelBubble = true
        if (movable) event.target.getStage()?.draggable(false)
      },
      onMouseUp: (event: Konva.KonvaEventObject<MouseEvent>) => {
        if (!dragged.current) restoreStage(event.target)
      },
      onMouseEnter: (event: Konva.KonvaEventObject<MouseEvent>) => {
        const container = event.target.getStage()?.container()
        if (container && movable) container.style.cursor = 'move'
      },
      onMouseLeave: (event: Konva.KonvaEventObject<MouseEvent>) => {
        const container = event.target.getStage()?.container()
        if (container) container.style.cursor = ''
      },
      onClick: pick,
      onTap: pick,
      onDragStart: (event: Konva.KonvaEventObject<DragEvent>) => {
        event.cancelBubble = true
        dragged.current = true
        event.target.getStage()?.draggable(false)
        onHoldStage?.(true)
      },
      onDragMove: (event: Konva.KonvaEventObject<DragEvent>) => {
        event.cancelBubble = true
      },
      onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => {
        event.cancelBubble = true
        restoreStage(event.target)
        onHoldStage?.(false)
        const next = {
          x: event.target.x() - layer.width / 2,
          y: event.target.y() - layer.height / 2,
        }
        onSelect?.(layer.id)
        if (
          Math.abs(next.x - layer.transform.x) < 0.5 &&
          Math.abs(next.y - layer.transform.y) < 0.5
        ) {
          return
        }
        // oxlint-disable-next-line react/set-state-in-effect -- 服务端确认拖动位置后释放 Konva 临时位置
        setDrop(next)
        onMove?.(layer.id, next.x, next.y)
      },
    },
  }
}
