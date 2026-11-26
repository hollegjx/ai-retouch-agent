import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type Konva from 'konva'
import { Stage } from 'react-konva'
import type { LayerDocument } from '@/types/sessions'
import { SelectionOverlay } from '@/pages/editor/components/SelectionOverlay'
import { canvasStamp, useHeldCanvas } from '@/hooks/useHeldCanvas'
import { usePointPreview } from '@/hooks/usePointPreview'
import { useSelectStroke } from '@/hooks/useSelectStroke'
import { useElementSize } from '@/hooks/useElementSize'
import { toAdjustPreview } from '@/lib/adjustPreview'
import { useCanvasView } from '@/stores/canvasView'
import { useEditorUi, type CanvasSelection } from '@/stores/editorUi'
import { CanvasBoard, CanvasGhost, type GhostFrame } from './canvas/CanvasSurface'
import { DocumentLayer } from './canvas/DocumentLayer'
import { TextEditor } from './canvas/TextEditor'
import { CompareDivider, CropLayer } from './canvas/CanvasOverlays'

export const SWITCH_FADE_MS = 160

export default function CanvasStage({
  document,
  previous,
  urls,
  selection = null,
  onPoint,
  onStroke,
  onMove,
  onScale,
  onEditText,
}: {
  document: LayerDocument
  previous: LayerDocument | null
  urls: Map<string, string>
  selection?: CanvasSelection | null
  onPoint?: (x: number, y: number) => void
  onStroke?: (points: { x: number; y: number }[]) => void
  onMove?: (layerId: string, x: number, y: number) => void
  onScale?: (layerId: string, scale: number, x: number, y: number) => void
  onEditText?: (layerId: string, text: string) => void
}) {
  const [containerRef, size] = useElementSize<HTMLDivElement>()
  const scale = useCanvasView((state) => state.scale)
  const x = useCanvasView((state) => state.x)
  const y = useCanvasView((state) => state.y)
  const setViewport = useCanvasView((state) => state.setViewport)
  const fit = useCanvasView((state) => state.fit)
  const zoomByWheel = useCanvasView((state) => state.zoomByWheel)
  const panBy = useCanvasView((state) => state.panBy)
  const pan = useCanvasView((state) => state.pan)

  const cropOpen = useEditorUi((state) => state.cropOpen)
  const cropRect = useEditorUi((state) => state.cropRect)
  const cropRatio = useEditorUi((state) => state.cropRatio)
  const setCropRect = useEditorUi((state) => state.setCropRect)
  const compareOpen = useEditorUi((state) => state.compareOpen)
  const compareAt = useEditorUi((state) => state.compareAt)
  const setCompareAt = useEditorUi((state) => state.setCompareAt)
  const adjustPreview = useEditorUi((state) => state.adjustPreview)
  const layerPreview = useEditorUi((state) => state.layerPreview)
  const selectMode = useEditorUi((state) => state.selectMode)
  const selectedLayerId = useEditorUi((state) => state.selectedLayerId)
  const selectLayer = useEditorUi((state) => state.selectLayer)
  const shown = useHeldCanvas(document, urls)
  const canvas = shown.document
  const images = shown.urls
  const shownRef = useRef(shown)
  const [ghost, setGhost] = useState<GhostFrame | null>(null)
  const [ghostOpacity, setGhostOpacity] = useState(0)
  const [holdingStage, setHoldingStage] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const stroke = useSelectStroke()
  const point = usePointPreview(canvas, images)
  const editing = editingId
    ? (canvas.layers.find((layer) => layer.id === editingId && layer.kind === 'text') ?? null)
    : null
  const selecting = Boolean(selectMode)
  const interactive = !selecting && !cropOpen && !compareOpen
  const stageDraggable = !cropOpen && !selecting && !holdingStage

  const settleStroke = stroke.settle
  const settlePoint = point.settle
  const settleOverlay = useCallback(() => {
    settleStroke()
    settlePoint()
  }, [settleStroke, settlePoint])

  useEffect(() => {
    if (!selection) settleOverlay()
  }, [selection, settleOverlay])

  useEffect(() => {
    if (selectMode !== 'point') settlePoint()
  }, [selectMode, settlePoint])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- 退出画布模式时同步关闭 DOM 文字编辑框。
    if (!interactive) setEditingId(null)
  }, [interactive])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- 图层删除后释放其 DOM 文字编辑器。
    if (editingId && !editing) setEditingId(null)
  }, [editingId, editing])

  const fitted = useRef('')

  const canvasPoint = (stage: Konva.Stage | null) => {
    const pointer = stage?.getRelativePointerPosition()
    if (!pointer) return null
    const x = pointer.x / canvas.width
    const y = pointer.y / canvas.height
    if (x < 0 || y < 0 || x > 1 || y > 1) return null
    return { x, y }
  }

  useEffect(() => {
    setViewport(size)
  }, [size, setViewport])

  useLayoutEffect(() => {
    const prev = shownRef.current
    shownRef.current = shown
    if (canvasStamp(prev.document) === canvasStamp(shown.document)) return
    const view = useCanvasView.getState()
    setGhost({
      document: prev.document,
      urls: prev.urls,
      scale: view.scale,
      x: view.x,
      y: view.y,
    })
    setGhostOpacity(1)
  }, [shown])

  useLayoutEffect(() => {
    if (!size.width || !size.height) return
    const shape = `${canvas.width}x${canvas.height}`
    if (fitted.current === shape) return
    // 切图改画幅时一次对齐，不走适应缓动，否则同尺寸硬切、不同尺寸又会缩放到位
    fit(canvas, { animate: false })
    fitted.current = shape
  }, [size.width, size.height, canvas, fit])

  useEffect(() => {
    if (!ghost || ghostOpacity === 0) return
    const frame = requestAnimationFrame(() => setGhostOpacity(0))
    return () => cancelAnimationFrame(frame)
  }, [ghost, ghostOpacity])

  const split = canvas.width * compareAt
  const color = useMemo(() => toAdjustPreview(adjustPreview), [adjustPreview])
  const compareWith = compareOpen ? previous : null

  return (
    <div
      ref={containerRef}
      className={`bg-canvas relative h-full w-full overflow-hidden ${
        selecting || cropOpen ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      <Stage
        width={size.width}
        height={size.height}
        x={x}
        y={y}
        scaleX={scale}
        scaleY={scale}
        draggable={stageDraggable}
        onMouseDown={(event) => {
          if (selectMode !== 'brush' || !onStroke) return
          const point = canvasPoint(event.target.getStage())
          if (point) stroke.start(point)
        }}
        onMouseMove={(event) => {
          if (selectMode !== 'brush' || !onStroke) return
          const point = canvasPoint(event.target.getStage())
          if (point) stroke.move(point)
        }}
        onMouseUp={() => {
          if (selectMode !== 'brush' || !onStroke) return
          const points = stroke.end()
          if (points.length) onStroke(points)
        }}
        onClick={(event) => {
          if (selectMode !== 'point' || !onPoint) return
          const picked = canvasPoint(event.target.getStage())
          if (!picked) return
          point.pick(picked, selection?.markers ?? [])
          onPoint(picked.x, picked.y)
        }}
        onDragMove={(event) => {
          if (event.target !== event.target.getStage()) return
          pan({ x: event.target.x(), y: event.target.y() })
        }}
        onDblClick={(event) => {
          if (selecting || event.target !== event.target.getStage()) return
          fit(canvas)
        }}
        onWheel={(event) => {
          event.evt.preventDefault()
          // 捏合与 ⌘ 滚动缩放，普通滚动平移，与主流画布一致
          if (event.evt.ctrlKey || event.evt.metaKey) {
            const pointer = event.target.getStage()?.getPointerPosition()
            zoomByWheel(event.evt.deltaY, pointer ?? undefined)
            return
          }
          panBy(-event.evt.deltaX, -event.evt.deltaY)
        }}
      >
        <CanvasBoard width={canvas.width} height={canvas.height} />

        {compareWith ? (
          <>
            <DocumentLayer
              document={compareWith}
              urls={images}
              clip={{ x: 0, y: 0, width: split, height: canvas.height }}
            />
            <DocumentLayer
              document={canvas}
              urls={images}
              color={color}
              layerPreview={layerPreview}
              clip={{
                x: split,
                y: 0,
                width: canvas.width - split,
                height: canvas.height,
              }}
            />
          </>
        ) : (
          <DocumentLayer
            document={canvas}
            urls={images}
            color={color}
            layerPreview={layerPreview}
            interactive={interactive}
            stageDraggable={stageDraggable}
            viewScale={scale}
            selectedId={selectedLayerId}
            editingId={editingId}
            onSelect={selectLayer}
            onMove={onMove}
            onScale={onScale}
            onEdit={interactive ? setEditingId : undefined}
            onHoldStage={setHoldingStage}
          />
        )}

        {compareWith && (
          <CompareDivider canvas={canvas} split={split} scale={scale} onChange={setCompareAt} />
        )}

        {cropOpen && cropRect && (
          <CropLayer
            canvas={canvas}
            rect={cropRect}
            scale={scale}
            keepRatio={cropRatio !== 'free'}
            onChange={setCropRect}
          />
        )}

        {(selection || stroke.draft.length > 0 || point.active) && (
          <SelectionOverlay
            document={canvas}
            selection={selection}
            scale={scale}
            draft={stroke.draft}
            pending={stroke.pending}
            preview={point.preview}
            markers={point.markers.length ? point.markers : selection?.markers}
            onMaskReady={settleOverlay}
          />
        )}
      </Stage>
      {editing && (
        <TextEditor
          layer={editing}
          view={{ scale, x, y }}
          onCommit={(text) => {
            setEditingId(null)
            if (text !== (editing.text || '')) onEditText?.(editing.id, text)
          }}
          onCancel={() => setEditingId(null)}
        />
      )}
      {ghost && (
        <CanvasGhost
          key={canvasStamp(ghost.document)}
          frame={ghost}
          opacity={ghostOpacity}
          size={size}
          onFaded={() => {
            setGhost(null)
            setGhostOpacity(0)
          }}
        />
      )}
    </div>
  )
}
