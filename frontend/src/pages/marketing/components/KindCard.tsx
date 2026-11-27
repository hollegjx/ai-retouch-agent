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
    <div className="bg-soft flex flex-col rounded-[18px] p-5 transition-[background-color,transform] duration-500 ease-soft hover:bg-[#ededf0]">
      <p className="text-ink text-[15px] font-semibold tracking-[-0.015em]">{label}</p>
      <p className="text-muted mt-1 min-h-8 flex-1 text-[13px] leading-relaxed">{hint}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={onGenerate}
        className="bg-paper text-ink mt-4 self-start rounded-full px-4 py-1.5 text-[13px] font-medium shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-ink hover:text-white disabled:opacity-40"
      >
        {running ? '生成中…' : '生成'}
      </button>
    </div>
  )
}
