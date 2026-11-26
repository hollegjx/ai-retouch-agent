import { canvasTheme } from '@/styles/canvasTheme'
import { useEffect, useRef } from 'react'
import type Konva from 'konva'
import { Circle, Group, Layer as KonvaLayer, Line, Rect, Transformer } from 'react-konva'
import type { LayerDocument } from '@/types/sessions'
import { type CropRect } from '@/stores/editorUi'

/** 对比分割线随画布一起缩放平移，手柄与线宽保持屏幕尺寸不变。 */
export function CompareDivider({
  canvas,
  split,
  scale,
  onChange,
}: {
  canvas: LayerDocument
  split: number
  scale: number
  onChange: (value: number) => void
}) {
  const cursor = (node: Konva.Node, shape: string) => {
    const container = node.getStage()?.container()
    if (container) container.style.cursor = shape
  }

  return (
    <KonvaLayer>
      <Line
        points={[split, 0, split, canvas.height]}
        stroke={canvasTheme.handle}
        strokeWidth={2}
        strokeScaleEnabled={false}
        listening={false}
      />
      <Group
        x={split}
        y={canvas.height / 2}
        scaleX={1 / scale}
        scaleY={1 / scale}
        draggable
        onMouseEnter={(event) => cursor(event.target, 'ew-resize')}
        onMouseLeave={(event) => cursor(event.target, '')}
        onDragMove={(event) => {
          const node = event.target
          // 直接用画布坐标系下的指针位置，手柄自身的反向缩放不参与换算
          const pointer = node.getStage()?.getRelativePointerPosition()
          if (!pointer) return
          const next = Math.min(canvas.width, Math.max(0, pointer.x))
          node.position({ x: next, y: canvas.height / 2 })
          onChange(next / canvas.width)
        }}
      >
        <Circle radius={15} fill={canvasTheme.handle} />
        <Line
          points={[-7, -4, -11, 0, -7, 4]}
          stroke={canvasTheme.muted}
          strokeWidth={1.6}
          lineCap="round"
        />
        <Line
          points={[7, -4, 11, 0, 7, 4]}
          stroke={canvasTheme.muted}
          strokeWidth={1.6}
          lineCap="round"
        />
      </Group>
    </KonvaLayer>
  )
}

export function CropLayer({
  canvas,
  rect,
  scale,
  keepRatio,
  onChange,
}: {
  canvas: LayerDocument
  rect: CropRect
  scale: number
  keepRatio: boolean
  onChange: (rect: CropRect) => void
}) {
  const rectRef = useRef<Konva.Rect>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    const transformer = transformerRef.current
    const node = rectRef.current
    if (!transformer || !node) return
    transformer.nodes([node])
    transformer.getLayer()?.batchDraw()
  }, [rect])

  // 夹取后的值可能与上一帧相同，此时不会触发重渲染，得手动把节点摆回边界内
  const commit = (next: CropRect) => {
    const clamped = clampRect(next, canvas)
    onChange(clamped)
    return clamped
  }

  // 手柄与描边按倍率反向补偿，缩放后依然是同样的点按面积
  const invert = 1 / scale
  const shade = canvasTheme.scrim

  return (
    <KonvaLayer>
      <Group listening={false}>
        <Rect width={canvas.width} height={rect.y} fill={shade} />
        <Rect
          y={rect.y + rect.height}
          width={canvas.width}
          height={Math.max(0, canvas.height - rect.y - rect.height)}
          fill={shade}
        />
        <Rect y={rect.y} width={rect.x} height={rect.height} fill={shade} />
        <Rect
          x={rect.x + rect.width}
          y={rect.y}
          width={Math.max(0, canvas.width - rect.x - rect.width)}
          height={rect.height}
          fill={shade}
        />
      </Group>
      <Rect
        ref={rectRef}
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        stroke={canvasTheme.selection}
        strokeWidth={2}
        strokeScaleEnabled={false}
        dash={[7 * invert, 5 * invert]}
        draggable
        onDragMove={(event) => {
          const next = commit({
            ...rect,
            x: event.target.x(),
            y: event.target.y(),
          })
          event.target.position({ x: next.x, y: next.y })
        }}
        onTransform={() => {
          const node = rectRef.current
          if (!node) return
          const next = commit({
            x: node.x(),
            y: node.y(),
            width: Math.max(32, node.width() * node.scaleX()),
            height: Math.max(32, node.height() * node.scaleY()),
          })
          node.setAttrs({ ...next, scaleX: 1, scaleY: 1 })
        }}
      />
      <Transformer
        ref={transformerRef}
        rotateEnabled={false}
        flipEnabled={false}
        keepRatio={keepRatio}
        ignoreStroke
        anchorSize={10 * invert}
        anchorCornerRadius={3 * invert}
        anchorStrokeWidth={1.5 * invert}
        borderStrokeWidth={invert}
        anchorStroke={canvasTheme.selection}
        borderStroke={canvasTheme.selection}
        boundBoxFunc={(oldBox, newBox) =>
          newBox.width < 32 || newBox.height < 32 ? oldBox : newBox
        }
      />
    </KonvaLayer>
  )
}

function clampRect(rect: CropRect, canvas: LayerDocument): CropRect {
  const width = Math.min(rect.width, canvas.width)
  const height = Math.min(rect.height, canvas.height)
  return {
    width,
    height,
    x: Math.min(Math.max(0, rect.x), canvas.width - width),
    y: Math.min(Math.max(0, rect.y), canvas.height - height),
  }
}
