import type { ReactNode } from 'react'
import Button from '@/components/ui/Button'

export default function StatePanel({
  title,
  description,
  loading,
  error,
  onRetry,
  children,
}: {
  title: string
  description?: string
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  children?: ReactNode
}) {
  return (
    <div
      className={`state ${error ? 'state-error' : ''}`}
      role={error ? 'alert' : 'status'}
      aria-busy={loading}
    >
      {loading && <span className="spinner mb-4" aria-hidden />}
      {error && (
        <span
          className="bg-danger mx-auto mb-4 grid size-9 place-items-center rounded-full text-base font-semibold text-white"
          aria-hidden
        >
          !
        </span>
      )}
      <h2>{title}</h2>
      {description && <p className="mx-auto max-w-md">{description}</p>}
      {(onRetry || children) && (
        <div className="mt-5 flex justify-center gap-2">
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              重试
            </Button>
          )}
          {children}
        </div>
      )}
    </div>
  )
}
