import type { ReactNode } from 'react'

export default function PageHeading({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <header className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}
