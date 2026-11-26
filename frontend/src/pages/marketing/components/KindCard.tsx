export function KindCard({
  label,
  hint,
  disabled,
  running,
  onGenerate,
}: {
  label: string
  hint: string
  disabled: boolean
  running: boolean
  onGenerate: () => void
}) {
  return (
    <div className="border-line bg-paper flex flex-col rounded-card border p-4">
      <p className="text-ink text-sm font-medium">{label}</p>
      <p className="text-faint mt-1 min-h-8 flex-1 text-xs leading-relaxed">{hint}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={onGenerate}
        className="border-line text-ink hover:bg-soft rounded-control mt-3 px-3 py-2 text-xs font-medium disabled:opacity-40"
      >
        {running ? '生成中…' : '生成'}
      </button>
    </div>
  )
}
