import { canvasTheme } from '@/styles/canvasTheme'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type Konva from 'konva'
import { Image as KonvaImage, Layer as KonvaLayer, Text } from 'react-konva'
import type { Layer, LayerDocument } from '@/types/sessions'
import { useCanvasImage } from '@/hooks/useCanvasImage'
import { makeAdjustFilter, type AdjustPreview } from '@/lib/adjustPreview'
import { type LayerPreview } from '@/stores/editorUi'
import {
  type Pinned,
  transformStamp,
  samePinned,
  layerPoint,
  layerScale,
  useLayerInteract,
} from './useLayerInteract'
import { LayerScaler } from './LayerScaler'

const NO_FILTERS: ((imageData: ImageData) => void)[] = []

// 预览按屏幕分辨率量级缓存，滤镜每帧重算才跟得上滑杆
const PREVIEW_PIXEL_RATIO = 0.6

function useLayerNodes(selectedId: string | null) {
  const [nodes, setNodes] = useState<Map<string, Konva.Node>>(() => new Map())
  const register = useCallback((id: string, node: Konva.Node | null) => {
    setNodes((current) => {
      if ((current.get(id) ?? null) === node) return current
      const next = new Map(current)
      if (node) next.set(id, node)
      else next.delete(id)
      return next
    })
  }, [])
  return { selectedNode: selectedId ? (nodes.get(selectedId) ?? null) : null, register }
}

function useLayerNode(id: string, onRegister?: (id: string, node: Konva.Node | null) => void) {
  const nodeRef = useRef<Konva.Node | null>(null)
  const setRef = useCallback(
    (node: Konva.Node | null) => {
      nodeRef.current = node
      onRegister?.(id, node)
    },
    [id, onRegister],
  )
  return { nodeRef, setRef }
}

export function DocumentLayer({
  document,
  urls,
  color,
  layerPreview,
  clip,
  interactive = false,
  stageDraggable = false,
  viewScale = 1,
  selectedId = null,
  editingId = null,
  onSelect,
  onMove,
  onScale,
  onEdit,
  onHoldStage,
}: {
  document: LayerDocument
  urls: Map<string, string>
  color?: AdjustPreview | null
  layerPreview?: LayerPreview | null
  clip?: { x: number; y: number; width: number; height: number }
  interactive?: boolean
  stageDraggable?: boolean
  viewScale?: number
  selectedId?: string | null
  editingId?: string | null
  onSelect?: (id: string) => void
  onMove?: (layerId: string, x: number, y: number) => void
  onScale?: (layerId: string, scale: number, x: number, y: number) => void
  onEdit?: (id: string) => void
  onHoldStage?: (held: boolean) => void
}) {
  const { selectedNode, register } = useLayerNodes(selectedId)
  const [pinned, setPinned] = useState<Pinned | null>(null)
  const waitingStamp = useRef<string | null>(null)
  const layers = document.layers.filter((layer) => layer.visible)
  const selected = layers.find((layer) => layer.id === selectedId) ?? null
  const stamp = selected ? transformStamp(selected) : ''

  useEffect(() => {
    if (!pinned) return
    if (!selected || selected.id !== pinned.id) {
      waitingStamp.current = null
      // oxlint-disable-next-line react/set-state-in-effect -- 服务端快照确认后释放 Konva 临时变换
      setPinned(null)
      return
    }
    if (samePinned(selected, pinned)) {
      waitingStamp.current = null
      return
    }
    // 文档还是钉住前的旧值：写入未完成，继续用钉住的画面
    if (stamp === waitingStamp.current) return
    waitingStamp.current = null
    // oxlint-disable-next-line react/set-state-in-effect -- 服务端快照确认后释放 Konva 临时变换
    setPinned(null)
  }, [stamp, pinned, selected])

  return (
    <KonvaLayer
      listening={interactive}
      clipX={clip?.x ?? 0}
      clipY={clip?.y ?? 0}
      clipWidth={clip?.width ?? document.width}
      clipHeight={clip?.height ?? document.height}
    >
      {layers.map((layer) =>
        layer.kind === 'text' ? (
          <TextLayer
            key={layer.id}
            layer={layer}
            preview={layerPreview?.id === layer.id ? layerPreview : null}
            pinned={pinned?.id === layer.id ? pinned : null}
            interactive={interactive}
            stageDraggable={stageDraggable}
            selected={selectedId === layer.id}
            editing={editingId === layer.id}
            onSelect={onSelect}
            onMove={onMove}
            onEdit={onEdit}
            onHoldStage={onHoldStage}
            onRegister={register}
          />
        ) : layer.kind === 'image' ? (
          <ImageLayer
            key={layer.id}
            layer={layer}
            url={layer.asset_id ? urls.get(layer.asset_id) : undefined}
            color={color ?? null}
            preview={layerPreview?.id === layer.id ? layerPreview : null}
            pinned={pinned?.id === layer.id ? pinned : null}
            interactive={interactive}
            stageDraggable={stageDraggable}
            selected={selectedId === layer.id}
            onSelect={onSelect}
            onMove={onMove}
            onHoldStage={onHoldStage}
            onRegister={register}
          />
        ) : null,
      )}
      {interactive && selected && selectedNode && editingId !== selected.id && (
        <LayerScaler
          node={selectedNode}
          layer={selected}
          viewScale={viewScale}
          onScale={(layerId, scale, x, y) => {
            waitingStamp.current = stamp
            // oxlint-disable-next-line react/set-state-in-effect -- 服务端快照确认后释放 Konva 临时变换
            setPinned({ id: layerId, scale, x, y })
            onScale?.(layerId, scale, x, y)
          }}
          onHoldStage={onHoldStage}
        />
      )}
    </KonvaLayer>
  )
}

function TextLayer({
  layer,
  preview,
  pinned = null,
  interactive = false,
  stageDraggable = false,
  selected = false,
  editing = false,
  onSelect,
  onMove,
  onEdit,
  onHoldStage,
  onRegister,
}: {
  layer: Layer
  preview: LayerPreview | null
  pinned?: Pinned | null
  interactive?: boolean
  stageDraggable?: boolean
  selected?: boolean
  editing?: boolean
  onSelect?: (id: string) => void
  onMove?: (layerId: string, x: number, y: number) => void
  onEdit?: (id: string) => void
  onHoldStage?: (held: boolean) => void
  onRegister?: (id: string, node: Konva.Node | null) => void
}) {
  const drag = useLayerInteract(
    layer,
    interactive && !editing,
    stageDraggable,
    onSelect,
    onMove,
    onHoldStage,
  )
  const { setRef } = useLayerNode(layer.id, onRegister)
  const { transform } = layer
  const point = layerPoint(layer, preview, drag.drop, pinned)
  const sized = layerScale(layer, preview, pinned)

  return (
    <Text
      ref={setRef}
      text={preview?.text ?? layer.text ?? layer.name}
      x={point.x}
      y={point.y}
      offsetX={layer.width / 2}
      offsetY={layer.height / 2}
      width={layer.width}
      height={layer.height}
      fontSize={preview?.font_size ?? layer.font_size ?? Math.max(12, layer.height * 0.72)}
      fill={preview?.fill ?? layer.fill ?? canvasTheme.ink}
      align="center"
      verticalAlign="middle"
      scaleX={sized.x}
      scaleY={sized.y}
      rotation={preview?.rotation ?? transform.rotation}
      opacity={editing ? 0 : (preview?.opacity ?? layer.opacity)}
      {...drag.handlers}
      onDblClick={(event) => {
        if (!interactive) return
        event.cancelBubble = true
        onSelect?.(layer.id)
        onEdit?.(layer.id)
      }}
      stroke={selected && interactive && !editing ? canvasTheme.selection : undefined}
      strokeWidth={selected && interactive && !editing ? 2 : 0}
      strokeScaleEnabled={false}
    />
  )
}

function ImageLayer({
  layer,
  url,
  color,
  preview,
  pinned = null,
  interactive = false,
  stageDraggable = false,
  selected = false,
  onSelect,
  onMove,
  onHoldStage,
  onRegister,
}: {
  layer: Layer
  url: string | undefined
  color: AdjustPreview | null
  preview: LayerPreview | null
  pinned?: Pinned | null
  interactive?: boolean
  stageDraggable?: boolean
  selected?: boolean
  onSelect?: (id: string) => void
  onMove?: (layerId: string, x: number, y: number) => void
  onHoldStage?: (held: boolean) => void
  onRegister?: (id: string, node: Konva.Node | null) => void
}) {
  const image = useCanvasImage(url)
  const { nodeRef, setRef } = useLayerNode(layer.id, onRegister)
  const drag = useLayerInteract(layer, interactive, stageDraggable, onSelect, onMove, onHoldStage)
  const filtered = color !== null && image?.safe === true
  // 数值不变时保持数组同一引用，平移缩放才不会白白重算滤镜
  const filters = useMemo(
    () => (filtered && color ? [makeAdjustFilter(color)] : NO_FILTERS),
    [filtered, color],
  )

  // 滤镜要求节点先缓存；缓存后的位图同时让缩放平移更省算力
  useEffect(() => {
    const node = nodeRef.current
    if (!node || !image) return
    if (filtered) node.cache({ pixelRatio: PREVIEW_PIXEL_RATIO })
    else node.clearCache()
  }, [image, filtered, layer.width, layer.height, nodeRef])

  if (!image) return null

  const { transform } = layer
  const point = layerPoint(layer, preview, drag.drop, pinned)
  const sized = layerScale(layer, preview, pinned)

  return (
    <KonvaImage
      ref={setRef}
      image={image.element}
      x={point.x}
      y={point.y}
      offsetX={layer.width / 2}
      offsetY={layer.height / 2}
      width={layer.width}
      height={layer.height}
      scaleX={sized.x}
      scaleY={sized.y}
      rotation={preview?.rotation ?? transform.rotation}
      opacity={preview?.opacity ?? layer.opacity}
      filters={filters}
      {...drag.handlers}
      stroke={selected && interactive ? canvasTheme.selection : undefined}
      strokeWidth={selected && interactive ? 2 : 0}
      strokeScaleEnabled={false}
    />
  )
}
