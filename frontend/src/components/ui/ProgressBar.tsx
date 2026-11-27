/**
 * 进度值本身已经是逐帧动画，所以条体不再加宽度过渡，否则两层插值叠起来会拖影。
 * 填充上扫过的高光只是装饰，不改变进度含义。
 */
export default function ProgressBar({
  value,
  tone = 'ink',
  className = 'h-0.5',
}: {
  value: number
  tone?: 'ink' | 'brand'
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`overflow-hidden rounded-full bg-black/[0.08] ${className}`}
    >
      <div
        className={`progress-fill h-full rounded-full ${tone === 'brand' ? 'bg-brand-strong' : 'bg-brand'}`}
        style={{ width: `${Math.max(clamped, 2)}%` }}
      />
    </div>
  )
}
