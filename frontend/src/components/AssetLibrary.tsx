import { useState } from 'react'
import type { LibraryGroup } from '@/types/assets'
import { formatDateTime } from '@/lib/format'

export default function AssetLibrary({
  groups,
  onOpenSession,
  onOpenAsset,
  disabled,
}: {
  groups: LibraryGroup[]
  onOpenSession: (sessionId: string) => void
  onOpenAsset: (assetId: string) => void
  disabled?: boolean
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  return (
    <ul className="library-grid">
      {groups.map((group) => {
        const key = group.session_id ?? 'orphan'
        const open = () =>
          group.session_id ? onOpenSession(group.session_id) : onOpenAsset(group.cover.id)
        return (
          <li key={key} className="project-card lift">
            <button
              type="button"
              onClick={open}
              disabled={disabled}
              className="block w-full overflow-hidden text-left active:[transform:scale(0.985)]"
            >
              <span className="block overflow-hidden">
                <img
                  src={group.cover.url}
                  alt={group.title}
                  loading="lazy"
                  className="project-cover zoom-media"
                />
              </span>
              <div className="px-5 pt-4 pb-5">
                <h3 className="truncate text-[15px] font-semibold tracking-[-0.015em]">
                  {group.title}
                </h3>
                <p className="mt-1 text-[13px] text-muted">
                  {group.assets.length} 张 · {formatDateTime(group.updated_at)}
                </p>
              </div>
            </button>
            {group.assets.length > 1 && (
              <div className="px-5 pb-5">
                <button
                  className="text-[13px] text-muted hover:text-ink"
                  type="button"
                  aria-expanded={expanded === key}
                  onClick={() => setExpanded(expanded === key ? null : key)}
                >
                  {expanded === key ? '收起素材 ↑' : '查看素材 ↓'}
                </button>
                {expanded === key && (
                  <div className="stagger mt-4 grid grid-cols-3 gap-2">
                    {group.assets.map((asset) => (
                      <button
                        type="button"
                        key={asset.id}
                        disabled={disabled}
                        onClick={() =>
                          group.session_id ? onOpenSession(group.session_id) : onOpenAsset(asset.id)
                        }
                      >
                        <img
                          className="aspect-square w-full rounded-chip bg-soft object-contain transition-transform duration-500 ease-soft hover:scale-[1.04]"
                          src={asset.url}
                          alt={`${asset.width} × ${asset.height} 素材`}
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
