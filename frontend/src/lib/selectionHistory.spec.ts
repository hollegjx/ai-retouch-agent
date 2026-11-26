import { expect, it } from 'vitest'
import { createSelectionHistory, inputsOf } from './selectionHistory'

it('选区撤销、重做、清除及新分支互相独立', () => {
  const history = createSelectionHistory()
  history.commit({ kind: 'point', point: { x: 0.2, y: 0.3 } })
  history.commit({ kind: 'stroke', points: [{ x: 0.4, y: 0.5 }] })
  expect(inputsOf(history.undo() ?? []).points).toHaveLength(1)
  expect(history.redo()).toHaveLength(2)
  history.clear()
  expect(history.current).toEqual([])
  expect(history.undo()).toHaveLength(2)
  history.commit({ kind: 'point', point: { x: 0.1, y: 0.1 } })
  expect(history.canRedo()).toBe(false)
})
