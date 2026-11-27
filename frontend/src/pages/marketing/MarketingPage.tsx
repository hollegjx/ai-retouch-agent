import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AssetLibrary from '@/components/AssetLibrary'
import ProgressBar from '@/components/ui/ProgressBar'
import { buttonClass } from '@/components/ui/buttonStyles'
import { errorMessage } from '@/utils/errors'
import { useAssetLibrary } from '@/hooks/useAssets'
import { useCreateSession, useExportPack, useSession, useSessionTools } from '@/hooks/useSessions'
import { shortTitle } from '@/lib/format'
import { DELIVERY_RATIOS, MARKETING_KINDS, defaultSelected, packable } from '@/lib/marketing'
import StatePanel from '@/components/ui/StatePanel'
import { saveDownload } from '@/utils/download'
import { toast } from '@/stores/toasts'
import { PageTitle, SectionHead } from './components/Headings'
import { SessionSwitch } from './components/SessionSwitch'
import { KindCard } from './components/KindCard'
import { PackList } from './components/PackList'

export default function MarketingPage() {
  const { sessionId = '' } = useParams()
  return sessionId ? <Workspace sessionId={sessionId} /> : <Picker />
}

function Picker() {
  const navigate = useNavigate()
  const { data: groups = [], isPending, isError, error, refetch } = useAssetLibrary()
  const createSession = useCreateSession()

  const open = (id: string) => navigate(`/marketing/${id}`)

  return (
    <div className="page">
      <PageTitle />
      <h2 className="mb-5 text-[19px] font-semibold tracking-[-0.022em]">选择会话</h2>
      {isPending ? (
        <StatePanel title="正在读取素材" loading />
      ) : isError ? (
        <StatePanel
          error
          title="素材加载失败"
          description={errorMessage(error)}
          onRetry={() => void refetch()}
        />
      ) : groups.length === 0 ? (
        <p className="text-muted text-[15px]">
          还没有可导出的会话，先到
          <Link to="/create" className="mx-1 font-medium text-ink underline underline-offset-4">
            创作
          </Link>
          打开一张图。
        </p>
      ) : (
        <AssetLibrary
          groups={groups}
          onOpenSession={open}
          disabled={createSession.isPending}
          onOpenAsset={(assetId) =>
            !createSession.isPending &&
            createSession.mutate(
              { current_asset_id: assetId },
              { onSuccess: (session) => open(session.id) },
            )
          }
        />
      )}
      {createSession.isError && (
        <p className="mt-4 text-danger" role="alert">
          {errorMessage(createSession.error)}
        </p>
      )}
    </div>
  )
}

function Workspace({ sessionId }: { sessionId: string }) {
  const { data: session, isError, error, refetch } = useSession(sessionId)
  const tools = useSessionTools(sessionId)
  const pack = useExportPack(sessionId)
  const [copy, setCopy] = useState('')
  const [picked, setPicked] = useState<string[] | null>(null)

  const selected = useMemo(() => {
    if (!session) return []
    return picked ?? defaultSelected(session.assets, session.current_asset_id)
  }, [session, picked])

  if (!session)
    return (
      <div className="page">
        <PageTitle />
        <StatePanel
          title={isError ? '会话加载失败' : '正在读取画布'}
          description={isError ? errorMessage(error) : undefined}
          error={isError}
          loading={!isError}
          onRetry={isError ? () => void refetch() : undefined}
        />
      </div>
    )

  const current = session.assets.find((asset) => asset.id === session.current_asset_id)
  const items = session.assets.filter((asset) => packable(asset, session.current_asset_id))

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPicked([...next])
  }

  const toggleAll = () => {
    const ids = items.map((asset) => asset.id)
    setPicked(ids.every((id) => selected.includes(id)) ? [] : ids)
  }

  // 不传 ratios 是「一次三个尺寸」，传了则只跑该比例
  const deliveryRunning = (ratio?: string) =>
    tools.isRunning('prepare_delivery_sizes', (params) => {
      const ratios = params.ratios as string[] | undefined
      return ratio ? ratios?.[0] === ratio : !ratios
    })

  const download = () =>
    !pack.isPending &&
    selected.length > 0 &&
    pack.mutate(selected, {
      onSuccess: ({ blob, filename }) => {
        saveDownload(blob, filename)
        toast(`已打包 ${selected.length} 张`)
      },
    })

  return (
    <div className="page">
      <PageTitle
        action={
          <Link to={`/editor/${sessionId}`} className={buttonClass({ variant: 'outline' })}>
            回编辑器
          </Link>
        }
      />

      <section className="panel mb-5 flex flex-wrap items-center gap-5 py-5">
        <div className="bg-soft size-20 shrink-0 overflow-hidden rounded-[16px]">
          {current && <img src={current.url} alt="" className="size-full object-contain" />}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-ink truncate text-[17px] font-semibold tracking-[-0.02em]"
            title={session.title}
          >
            {shortTitle(session.title, 28)}
          </p>
          <p className="text-muted mt-1 text-[13px] tabular-nums">
            画布 {session.document.width} × {session.document.height}
          </p>
        </div>
        <SessionSwitch currentId={sessionId} />
      </section>

      <div className="work-grid mb-14">
        <section className="panel">
          <SectionHead title="生成营销图" hint="以当前画布为参考生成，结果进图片墙，不改画布。" />
          <input
            aria-label="营销图要求"
            value={copy}
            onChange={(event) => setCopy(event.target.value)}
            disabled={tools.busy}
            placeholder="可选：海报文案或补充要求，例如「新品首发 限时 8 折」"
            className="form-field mb-4"
          />
          <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-2">
            {MARKETING_KINDS.map((item) => (
              <KindCard
                key={item.id}
                label={item.label}
                hint={item.hint}
                disabled={tools.busy}
                running={tools.isRunning('generate_marketing', (params) => params.kind === item.id)}
                onGenerate={() =>
                  tools.invoke('generate_marketing', {
                    kind: item.id,
                    caption: copy.trim() || undefined,
                  })
                }
              />
            ))}
          </div>
        </section>

        <section className="panel">
          <SectionHead
            title="转换投放尺寸"
            hint="扩到目标比例，主体不被裁切。默认可一次出三个投放尺寸。"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={tools.busy}
              onClick={() => tools.invoke('prepare_delivery_sizes')}
              className={buttonClass({ variant: 'solid', size: 'sm' })}
            >
              {deliveryRunning() ? '生成中…' : '生成 1:1 / 4:5 / 9:16'}
            </button>
            {DELIVERY_RATIOS.map((ratio) => (
              <button
                key={ratio.value}
                type="button"
                disabled={tools.busy}
                onClick={() => tools.invoke('prepare_delivery_sizes', { ratios: [ratio.value] })}
                className={buttonClass({ variant: 'outline', size: 'sm' })}
              >
                {ratio.label}
                <span className="text-faint">
                  {deliveryRunning(ratio.value) ? '生成中…' : ratio.size}
                </span>
              </button>
            ))}
          </div>
          {tools.busy && (
            <div className="animate-fade-in mt-4">
              <p className="text-muted text-[13px]">
                {tools.pendingStage || '处理中'}
                {tools.pending ? ` · ${tools.pendingProgress}%` : ''}
              </p>
              {tools.pending && (
                <ProgressBar value={tools.pendingProgress} tone="brand" className="mt-2 h-1 w-56" />
              )}
            </div>
          )}
        </section>
      </div>
      <PackList
        session={session}
        items={items}
        selected={selected}
        disabled={pack.isPending || tools.busy}
        packing={pack.isPending}
        onToggle={toggle}
        onToggleAll={toggleAll}
        onDownload={download}
        error={pack.isError ? errorMessage(pack.error) : null}
      />
    </div>
  )
}
