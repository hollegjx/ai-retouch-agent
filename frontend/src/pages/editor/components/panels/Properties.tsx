import type { Asset } from '@/types/assets'
import { formatBytes } from '@/lib/format'

export function Properties({
  document,
  current,
  revision,
}: {
  document: { width: number; height: number }
  current: Asset | undefined
  revision: number
}) {
  const rows: [string, string][] = [
    ['画布', `${document.width} × ${document.height}`],
    ['修订号', String(revision)],
  ]
  if (current) {
    rows.push(['格式', current.image_format])
    rows.push(['大小', formatBytes(current.size_bytes)])
    rows.push(['透明通道', current.has_alpha ? '有' : '无'])
  }

  return (
    <dl className="space-y-2 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-2">
          <dt className="text-muted">{label}</dt>
          <dd className="text-ink tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
