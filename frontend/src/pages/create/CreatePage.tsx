import { useNavigate } from 'react-router-dom'
import AssetLibrary from '@/components/AssetLibrary'
import GenerateForm from '@/components/GenerateForm'
import ImageDropzone from '@/components/ImageDropzone'
import PageHeading from '@/components/PageHeading'
import StatePanel from '@/components/ui/StatePanel'
import { errorMessage } from '@/utils/errors'
import { useAssetLibrary, useUploadAsset } from '@/hooks/useAssets'
import { useGenerate } from '@/hooks/useRun'
import { useCreateSession } from '@/hooks/useSessions'
import { readPromptDraft, savePromptDraft } from '@/lib/promptDraft'

export default function CreatePage() {
  const navigate = useNavigate()
  const library = useAssetLibrary()
  const upload = useUploadAsset()
  const generate = useGenerate()
  const createSession = useCreateSession()
  const openEditor = (assetId: string) => {
    if (createSession.isPending) return
    createSession.mutate(
      { current_asset_id: assetId },
      { onSuccess: (session) => navigate(`/editor/${session.id}`) },
    )
  }
  return (
    <div className="page">
      <PageHeading title="创作工作台" description="从一段描述或一张图片开始，继续完成你的作品。" />
      <div className="create-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>描述画面</h2>
            <span className="rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-muted">
              AI 生成
            </span>
          </div>
          <GenerateForm
            defaultPrompt={readPromptDraft()}
            pending={generate.isPending}
            onSubmit={(input) =>
              generate.mutate(input, {
                onSuccess: (run) => {
                  savePromptDraft('')
                  navigate(`/candidates/${run.id}`)
                },
              })
            }
          />
          {generate.isError && (
            <p role="alert" className="animate-fade-in mt-4 text-sm text-danger">
              {errorMessage(generate.error)}
            </p>
          )}
        </section>
        <section className="panel flex flex-col">
          <div className="section-heading">
            <h2>导入图片</h2>
            <span className="rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-muted">
              已有素材
            </span>
          </div>
          <p className="text-muted mb-6 text-[15px] leading-relaxed">
            上传产品图、照片或设计稿，在编辑器中继续精修。
          </p>
          <ImageDropzone
            onFile={(file) => upload.mutate(file, { onSuccess: (asset) => openEditor(asset.id) })}
            disabled={upload.isPending || createSession.isPending}
          />
          {upload.isError && (
            <p role="alert" className="animate-fade-in mt-4 text-sm text-danger">
              {errorMessage(upload.error)}
            </p>
          )}
          <p className="mt-auto pt-6 text-[13px] leading-relaxed text-muted">
            原图会保留在素材库。编辑器支持 AI 指令、图层调整、选区与撤销。
          </p>
        </section>
      </div>
      {createSession.isError && (
        <div className="mb-6">
          <StatePanel
            error
            title="打开编辑器失败"
            description={errorMessage(createSession.error)}
            onRetry={() =>
              createSession.variables && openEditor(createSession.variables.current_asset_id)
            }
          />
        </div>
      )}
      <section>
        <div className="section-heading">
          <h2>最近素材</h2>
          <span className="text-muted text-[13px]">按最近编辑排序</span>
        </div>
        {library.isPending ? (
          <StatePanel title="正在读取素材" loading />
        ) : library.isError ? (
          <StatePanel
            title="素材库加载失败"
            description={errorMessage(library.error)}
            error
            onRetry={() => void library.refetch()}
          />
        ) : !library.data?.length ? (
          <StatePanel title="还没有素材" description="生成或上传第一张图片，项目会显示在这里。" />
        ) : (
          <AssetLibrary
            groups={library.data}
            onOpenSession={(id) => navigate(`/editor/${id}`)}
            onOpenAsset={openEditor}
            disabled={createSession.isPending}
          />
        )}
      </section>
    </div>
  )
}
