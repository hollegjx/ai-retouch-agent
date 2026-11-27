export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[var(--hairline)] px-5 py-5 last:border-b-0">
      <h2 className="text-ink mb-3 text-[13px] font-semibold tracking-[-0.01em]">{title}</h2>
      {children}
    </section>
  )
}
