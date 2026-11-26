import { beforeEach, expect, it } from 'vitest'
import { useEditorUi } from './editorUi'

beforeEach(() => useEditorUi.setState(useEditorUi.getInitialState()))

it('裁剪保持在画布内并关闭冲突模式', () => {
  useEditorUi.getState().setSelectMode('point')
  useEditorUi.getState().openCrop({ width: 640, height: 480, layers: [] }, '9:16')
  const state = useEditorUi.getState()
  expect(state.selectMode).toBeNull()
  expect(state.cropRect?.height).toBe(480)
  expect(state.cropRect?.width).toBe(270)
  expect(state.cropRect?.x).toBe(185)
})

it('修订号更新后旧选区失效', () => {
  useEditorUi.getState().setSelection({ revision: 1, maskId: 'm', maskUrl: '/mask', markers: [] })
  useEditorUi.getState().dropStaleSelection(2)
  expect(useEditorUi.getState().selection).toBeNull()
})
