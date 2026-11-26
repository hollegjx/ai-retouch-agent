import { canvasTheme } from '@/styles/canvasTheme'
import { Layer as KonvaLayer, Rect, Stage } from 'react-konva'
import { type HeldCanvas } from '@/hooks/useHeldCanvas'
import { SWITCH_FADE_MS } from '../CanvasStage'
import { DocumentLayer } from './DocumentLayer'

export type GhostFrame = HeldCanvas & { scale: number; x: number; y: number }

export function CanvasBoard({ width, height }: { width: number; height: number }) {
  return (
    <KonvaLayer listening={false}>
      <Rect width={width} height={height} fill={canvasTheme.handle} />
    </KonvaLayer>
  )
}

export function CanvasGhost({
  frame,
  opacity,
  size,
  onFaded,
}: {
  frame: GhostFrame
  opacity: number
  size: { width: number; height: number }
  onFaded: () => void
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ opacity, transition: `opacity ${SWITCH_FADE_MS}ms ease-out` }}
      onTransitionEnd={(event) => {
        if (event.propertyName === 'opacity' && opacity === 0) onFaded()
      }}
    >
      <Stage
        width={size.width}
        height={size.height}
        x={frame.x}
        y={frame.y}
        scaleX={frame.scale}
        scaleY={frame.scale}
        listening={false}
      >
        <CanvasBoard width={frame.document.width} height={frame.document.height} />
        <DocumentLayer document={frame.document} urls={frame.urls} />
      </Stage>
    </div>
  )
}
