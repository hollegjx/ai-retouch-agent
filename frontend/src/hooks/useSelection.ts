import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { sessionsApi } from '@/service/api/sessions'
import type { SelectInput, Selection } from '@/types/sessions'
import { errorMessage } from '@/utils/errors'
import { BRUSH_RADIUS } from '@/lib/brush'
import { createSelectionHistory, inputsOf, type SelectionEntry } from '@/lib/selectionHistory'
import { toast } from '@/stores/toasts'
import { useEditorUi, type CanvasSelection } from '@/stores/editorUi'

function toCanvas(selection: Selection): CanvasSelection {
  return {
    revision: selection.revision,
    maskId: selection.mask.id,
    maskUrl: selection.mask.url,
    markers: selection.markers,
  }
}

function entryOf(input: SelectInput): SelectionEntry | null {
  if (input.strokes?.[0]) return { kind: 'stroke', points: input.strokes[0] }
  if (input.points?.[0]) return { kind: 'point', point: input.points[0] }
  return null
}

export function useSelection(sessionId: string, revision: number) {
  const setSelection = useEditorUi((state) => state.setSelection)
  const dropStaleSelection = useEditorUi((state) => state.dropStaleSelection)
  const selection = useEditorUi((state) => state.selection)
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- 切换会话或画布修订时创建独立的选区撤销栈。
  const history = useMemo(() => createSelectionHistory(), [sessionId, revision])
  const [, bump] = useState(0)
  const touch = () => bump((value) => value + 1)

  useEffect(() => {
    dropStaleSelection(revision)
  }, [revision, dropStaleSelection])

  useEffect(() => {
    setSelection(null)
  }, [sessionId, setSelection])

  const selectMode = useEditorUi((state) => state.selectMode)

  useEffect(() => {
    if (selectMode !== 'point') return
    void sessionsApi.prepareSelection(sessionId).catch(() => undefined)
  }, [selectMode, sessionId, revision])

  const select = useMutation({
    mutationFn: (input: SelectInput) => sessionsApi.select(sessionId, input),
    onSuccess: (body, input) => {
      const entry = entryOf(input)
      if (entry) history.commit(entry)
      setSelection(toCanvas(body))
      touch()
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  })

  const clear = useMutation({
    mutationFn: () => sessionsApi.clearSelection(sessionId),
    onSuccess: () => {
      history.clear()
      setSelection(null)
      touch()
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  })

  const replay = useMutation({
    mutationFn: async (entries: SelectionEntry[]) => {
      await sessionsApi.clearSelection(sessionId)
      if (!entries.length) return null
      const { strokes, points } = inputsOf(entries)
      let body: Selection | null = null
      if (points.length) {
        body = await sessionsApi.select(sessionId, { revision, points, append: false })
      }
      if (strokes.length) {
        body = await sessionsApi.select(sessionId, { revision, strokes, radius: BRUSH_RADIUS })
      }
      return body
    },
    onSuccess: (body) => setSelection(body ? toCanvas(body) : null),
    onError: (error) => toast(errorMessage(error), 'danger'),
    onSettled: touch,
  })

  const busy = select.isPending || clear.isPending || replay.isPending

  return {
    selection,
    busy,
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
    addPoint: (x: number, y: number) =>
      select.mutate({
        revision,
        points: [{ x, y }],
        append: Boolean(selection && selection.revision === revision),
      }),
    addStroke: (points: { x: number; y: number }[]) =>
      select.mutate({ revision, strokes: [points], radius: BRUSH_RADIUS }),
    clear: () => clear.mutate(),
    undo: () => {
      const next = history.undo()
      if (next !== null) replay.mutate(next)
    },
    redo: () => {
      const next = history.redo()
      if (next !== null) replay.mutate(next)
    },
  }
}

export type SessionSelection = ReturnType<typeof useSelection>
