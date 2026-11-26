export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-line border-b px-4 py-4 last:border-b-0">
      <h2 className="text-muted mb-3 text-xs font-medium">{title}</h2>
      {children}
    </section>
  )
}
