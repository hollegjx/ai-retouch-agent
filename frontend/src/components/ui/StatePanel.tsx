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
      {loading && <div className="bg-soft mx-auto mb-4 h-2 w-24 animate-pulse rounded-full" />}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {(onRetry || children) && (
        <div className="mt-4 flex justify-center gap-2">
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
