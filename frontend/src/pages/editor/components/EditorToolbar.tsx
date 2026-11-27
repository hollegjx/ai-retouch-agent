import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { SessionDetail } from '@/types/sessions'
import Button from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonStyles'
import type { SessionSelection } from '@/hooks/useSelection'
import type { SessionTools } from '@/hooks/useSessions'
import { ZOOM_STEP, useCanvasView } from '@/stores/canvasView'
import { useEditorUi, type CropRatio } from '@/stores/editorUi'

const CROP_RATIOS: CropRatio[] = ['free', '1:1', '4:5', '9:16', '16:9']

export default function EditorToolbar({
  session,
  tools,
  picking,
  onRename,
}: {
  session: SessionDetail
  tools: SessionTools
  picking: SessionSelection
  onRename: (title: string) => void
}) {
  const ui = useEditorUi()
  const view = useCanvasView()
  const [draft, setDraft] = useState<string | null>(null)
  const apply = (tool: string, params: Record<string, unknown> = {}) => {
    if (!tools.busy) tools.invoke(tool, params)
  }
  const actions = [
    { label: '裁剪', action: () => ui.openCrop(session.document) },
    { label: '去背景', action: () => apply('remove_background', { layer_id: ui.selectedLayerId }) },
    { label: '换背景', action: () => ui.setPanel('background') },
    { label: '调色', action: () => ui.setPanel('adjust') },
    { label: '点选', action: () => ui.setSelectMode('point') },
    { label: '笔刷', action: () => ui.setSelectMode('brush') },
    {
      label: '水平翻转',
      action: () => apply('flip_layer', { direction: 'horizontal', layer_id: ui.selectedLayerId }),
    },
    {
      label: '垂直翻转',
      action: () => apply('flip_layer', { direction: 'vertical', layer_id: ui.selectedLayerId }),
    },
    { label: '扩图', action: () => ui.setPanel('expand') },
    { label: '超分', action: () => apply('upscale_image', { scale: 2 }) },
    { label: '拆层', action: () => apply('split_layers', { include_text: ui.splitIncludeText }) },
  ]
  const commitTitle = () => {
    const next = draft?.trim()
    setDraft(null)
    if (next && next !== session.title) onRename(next)
  }
  return (
    <div className="shrink-0">
      <header className="editor-toolbar">
        <h1 className="sr-only">图片编辑 · {session.title}</h1>
        <input
          className="min-w-0 flex-1 rounded-[10px] bg-transparent px-2.5 py-1.5 text-[15px] font-semibold tracking-[-0.015em] outline-none transition-[background-color,box-shadow] duration-300 hover:bg-soft focus:bg-soft focus:shadow-[0_0_0_3px_rgb(0_0_0/0.06)]"
          value={draft ?? session.title}
          maxLength={80}
          aria-label="会话标题"
          disabled={tools.busy}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') setDraft(null)
          }}
        />
        <Button
          size="sm"
          disabled={tools.busy || picking.busy || !(picking.canUndo || session.can_undo)}
          title="撤销 ⌘Z"
          onClick={() => (picking.canUndo ? picking.undo() : tools.undo())}
        >
          撤销
        </Button>
        <Button
          size="sm"
          disabled={tools.busy || picking.busy || !(picking.canRedo || session.can_redo)}
          title="重做 ⌘⇧Z"
          onClick={() => (picking.canRedo ? picking.redo() : tools.redo())}
        >
          重做
        </Button>
        <Button
          size="sm"
          disabled={!session.previous_document}
          active={ui.compareOpen}
          onClick={() => ui.setCompareOpen(!ui.compareOpen)}
        >
          对比
        </Button>
        <Link
          to={`/marketing/${session.id}`}
          className={buttonClass({ variant: 'solid', size: 'sm' })}
        >
          导出
        </Link>
      </header>
      <div className="editor-toolbar">
        {ui.cropOpen ? (
          <>
            <label className="animate-fade-in flex items-center gap-2 text-[13px] text-muted">
              裁剪比例
              <select
                className="form-field form-field-sm w-auto"
                value={ui.cropRatio}
                onChange={(event) =>
                  ui.setCropRatio(event.target.value as CropRatio, session.document)
                }
              >
                {CROP_RATIOS.map((ratio) => (
                  <option key={ratio} value={ratio}>
                    {ratio === 'free' ? '自由' : ratio}
                  </option>
                ))}
              </select>
            </label>
            <Button
              size="sm"
              disabled={tools.busy || !ui.cropRect}
              onClick={() => {
                if (!ui.cropRect) return
                apply('crop_canvas', {
                  rect: {
                    x: ui.cropRect.x / session.document.width,
                    y: ui.cropRect.y / session.document.height,
                    width: ui.cropRect.width / session.document.width,
                    height: ui.cropRect.height / session.document.height,
                  },
                })
                ui.closeCrop()
              }}
            >
              确定
            </Button>
            <Button size="sm" onClick={ui.closeCrop}>
              取消
            </Button>
          </>
        ) : ui.selectMode ? (
          <div className="animate-fade-in flex flex-wrap items-center gap-0.5">
            <Button
              size="sm"
              active={ui.selectMode === 'point'}
              onClick={() => ui.setSelectMode('point')}
            >
              点选
            </Button>
            <Button
              size="sm"
              active={ui.selectMode === 'brush'}
              onClick={() => ui.setSelectMode('brush')}
            >
              笔刷
            </Button>
            <Button
              size="sm"
              disabled={tools.busy || picking.busy || !picking.selection}
              onClick={() =>
                apply('erase_region', {
                  mask_asset_id: picking.selection?.maskId,
                  revision: session.revision,
                  layer_id: ui.selectedLayerId,
                })
              }
            >
              消除
            </Button>
            <Button size="sm" disabled={!picking.selection} onClick={() => ui.setPanel('replace')}>
              替换
            </Button>
            <Button
              size="sm"
              disabled={tools.busy || picking.busy || !picking.selection}
              onClick={() =>
                apply('promote_object_to_layer', {
                  mask_asset_id: picking.selection?.maskId,
                  revision: session.revision,
                })
              }
            >
              成层
            </Button>
            <Button size="sm" disabled={!picking.selection || picking.busy} onClick={picking.clear}>
              清除
            </Button>
            <Button size="sm" variant="solid" onClick={() => ui.setSelectMode(null)}>
              完成
            </Button>
          </div>
        ) : (
          <>
            <div className="editor-tool-buttons animate-fade-in flex-wrap gap-0.5">
              {actions.map((item) => (
                <Button key={item.label} size="sm" disabled={tools.busy} onClick={item.action}>
                  {item.label}
                </Button>
              ))}
            </div>
            <select
              className="form-field form-field-sm editor-tool-select"
              aria-label="编辑工具"
              value=""
              disabled={tools.busy}
              onChange={(event) =>
                actions.find((item) => item.label === event.target.value)?.action()
              }
            >
              <option value="">选择编辑工具</option>
              {actions.map((item) => (
                <option key={item.label}>{item.label}</option>
              ))}
            </select>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          <div className="segmented">
            <Button
              variant="icon"
              size="sm"
              title="缩小"
              className="size-7!"
              onClick={() => view.stepZoom(1 / ZOOM_STEP)}
            >
              −
            </Button>
            <Button
              size="sm"
              title="恢复实际像素"
              className="min-h-7! min-w-14 px-2! tabular-nums"
              onClick={() => view.zoomTo(1)}
            >
              {Math.round(view.scale * 100)}%
            </Button>
            <Button
              variant="icon"
              size="sm"
              title="放大"
              className="size-7!"
              onClick={() => view.stepZoom(ZOOM_STEP)}
            >
              ＋
            </Button>
          </div>
          <Button size="sm" onClick={() => view.fit(session.document)}>
            适应
          </Button>
          <Button
            size="sm"
            active={ui.panel === 'layers'}
            onClick={() => ui.setPanel(ui.panel === 'layers' ? null : 'layers')}
          >
            图层
          </Button>
        </div>
      </div>
    </div>
  )
}
