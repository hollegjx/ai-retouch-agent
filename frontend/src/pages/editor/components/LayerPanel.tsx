import StatePanel from '@/components/ui/StatePanel'
import { errorMessage } from '@/utils/errors'
import { ACTION_LABELS } from '@/lib/sessions'
import type { SessionDetail } from '@/types/sessions'
import { BackgroundForm, ExpandForm, ReplaceForm } from '@/pages/editor/components/GenerateEdits'
import Button from '@/components/ui/Button'
import { useSessionHistory, type SessionTools } from '@/hooks/useSessions'
import { formatDateTime } from '@/lib/format'
import { wallOnly } from '@/lib/layers'
import { useEditorUi, type Panel } from '@/stores/editorUi'
import { LayerRow } from './panels/LayerRow'
import { TextForm } from './panels/TextForm'
import { LayerControls } from './panels/LayerControls'
import { AdjustForm } from './panels/AdjustForm'
import { Properties } from './panels/Properties'
import { Section } from './panels/Section'

export default function LayerPanel({
  session,
  tools,
  panel,
}: {
  session: SessionDetail
  tools: SessionTools
  // 由外层传入，关闭动画期间仍能画出原来的表单，不会先塌一半
  panel: Panel
}) {
  const current = session.assets.find((asset) => asset.id === session.current_asset_id)
  const historyQuery = useSessionHistory(session.id)
  const history = historyQuery.data ?? []
  const closePanel = useEditorUi((state) => state.setPanel)
  const selectedLayerId = useEditorUi((state) => state.selectedLayerId)
  const selectLayer = useEditorUi((state) => state.selectLayer)
  const selection = useEditorUi((state) => state.selection)
  const includeText = useEditorUi((state) => state.splitIncludeText)
  const setIncludeText = useEditorUi((state) => state.setSplitIncludeText)
  const selected =
    session.document.layers.find((layer) => layer.id === selectedLayerId) ??
    session.document.layers.at(-1)
  const onlyToWall = wallOnly(session.document)

  return (
    <aside className="bg-paper scrollbar-slim h-full w-full shrink-0 overflow-y-auto border-l border-[var(--hairline)]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--hairline)] bg-[var(--glass-strong)] px-5 py-3 backdrop-blur-xl">
        <h2 className="text-[17px] font-semibold tracking-[-0.02em]">属性与图层</h2>
        <Button size="sm" onClick={() => closePanel(null)}>
          关闭
        </Button>
      </div>
      {panel === 'adjust' && (
        <AdjustForm
          disabled={tools.busy}
          onApply={(params) =>
            tools.invoke('adjust_image', { ...params, layer_id: selectedLayerId })
          }
        />
      )}
      {panel === 'background' && (
        <BackgroundForm
          disabled={tools.busy}
          wallOnly={onlyToWall}
          onApply={(params) => tools.invoke('replace_background', params)}
        />
      )}
      {panel === 'expand' && (
        <ExpandForm
          disabled={tools.busy}
          wallOnly={onlyToWall}
          onApply={(params) => tools.invoke('expand_canvas', params)}
        />
      )}
      {panel === 'replace' && (
        <ReplaceForm
          disabled={tools.busy || !selection}
          onApply={(params) =>
            tools.invoke('replace_region', {
              ...params,
              mask_asset_id: selection?.maskId,
              revision: session.revision,
              layer_id: selectedLayerId,
            })
          }
        />
      )}

      <Section title="图层">
        <label className="text-muted mb-3 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={includeText}
            disabled={tools.busy}
            onChange={(event) => setIncludeText(event.target.checked)}
          />
          同时拆出文字
        </label>
        <div className="mb-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            block
            disabled={tools.busy}
            progress={tools.isRunning('split_layers') ? tools.pendingProgress : null}
            title={includeText ? '拆成背景、主体和文字，可撤销' : '拆成背景和主体，可撤销'}
            onClick={() => tools.invoke('split_layers', { include_text: includeText })}
          >
            拆层
          </Button>
          <Button
            variant="outline"
            size="sm"
            block
            disabled={tools.busy || !selection}
            progress={tools.isRunning('promote_object_to_layer') ? tools.pendingProgress : null}
            title={selection ? '把选区提升为独立图层，可撤销' : '先点选或涂抹'}
            onClick={() =>
              tools.invoke('promote_object_to_layer', {
                mask_asset_id: selection?.maskId,
                revision: session.revision,
              })
            }
          >
            成层
          </Button>
        </div>
        <ul className="space-y-1">
          {[...session.document.layers].reverse().map((layer) => (
            <LayerRow
              key={layer.id}
              layer={layer}
              active={selected?.id === layer.id}
              disabled={tools.busy}
              thumb={
                layer.asset_id
                  ? session.assets.find((asset) => asset.id === layer.asset_id)
                  : undefined
              }
              onSelect={() => selectLayer(layer.id)}
              onToggleVisible={() =>
                tools.invoke('set_layer_visible', {
                  layer_id: layer.id,
                  visible: !layer.visible,
                })
              }
            />
          ))}
        </ul>
      </Section>

      {selected?.kind === 'text' && (
        <Section title="文字">
          <p className="text-faint mb-3 text-xs leading-relaxed">
            改文案、字号或颜色。失焦写入，可用 ⌘Z 撤销。画布上双击文字层也可改。
          </p>
          <TextForm
            key={`${selected.id}:${selected.text}:${selected.font_size}:${selected.fill}`}
            layer={selected}
            disabled={tools.busy}
            onCommit={(params) =>
              tools.invoke('set_layer_text', { layer_id: selected.id, ...params })
            }
          />
        </Section>
      )}

      {selected && (
        <Section title="变换">
          <p className="text-faint mb-3 text-xs leading-relaxed">
            选中图层后拖角缩放、拖动画布移动。滑杆也可改，松手写入，可用 ⌘Z 撤销。
          </p>
          <LayerControls
            layer={selected}
            disabled={tools.busy}
            onOpacity={(opacity) =>
              tools.invoke('set_layer_opacity', {
                layer_id: selected.id,
                opacity,
              })
            }
            onScale={(scale) =>
              tools.invoke('scale_layer', {
                layer_id: selected.id,
                scale_x: scale,
                scale_y: scale,
              })
            }
            onRotate={(rotation) =>
              tools.invoke('rotate_layer', { layer_id: selected.id, rotation })
            }
            onReorder={(place) => tools.invoke('reorder_layer', { layer_id: selected.id, place })}
          />
        </Section>
      )}

      <Section title="属性">
        <Properties document={session.document} current={current} revision={session.revision} />
      </Section>

      <Section title="编辑记录">
        {historyQuery.isPending ? (
          <StatePanel title="读取记录中" loading />
        ) : historyQuery.isError ? (
          <StatePanel
            error
            title="记录加载失败"
            description={errorMessage(historyQuery.error)}
            onRetry={() => void historyQuery.refetch()}
          />
        ) : history.length === 0 ? (
          <p className="text-muted text-xs">暂无记录</p>
        ) : (
          <ol className="space-y-2">
            {history.map((entry) => (
              <li key={entry.seq} className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-ink">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                <span className="text-faint shrink-0 tabular-nums">
                  {formatDateTime(entry.created_at)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </aside>
  )
}
