import { beforeEach, expect, it } from 'vitest'
import { useCanvasView } from './canvasView'

beforeEach(() => useCanvasView.setState(useCanvasView.getInitialState()))

it('视口未就绪时延后适应，量出尺寸后居中', () => {
  useCanvasView.getState().fit({ width: 640, height: 480 }, { animate: false })
  useCanvasView.getState().setViewport({ width: 800, height: 600 })
  const { scale, x, y, awaitingFit } = useCanvasView.getState()
  expect(awaitingFit).toBeNull()
  expect(scale).toBeCloseTo(1.15)
  expect(x).toBeCloseTo(32)
  expect(y).toBeCloseTo(24)
})

it('指针缩放保持锚点下的图像坐标不变', () => {
  useCanvasView.setState({ scale: 1, x: 100, y: 50, viewport: { width: 800, height: 600 } })
  useCanvasView.getState().zoomBy(2, { x: 300, y: 250 })
  const { scale, x, y } = useCanvasView.getState()
  expect((300 - x) / scale).toBe(200)
  expect((250 - y) / scale).toBe(200)
})
