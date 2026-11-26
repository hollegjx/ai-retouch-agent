export type ButtonVariant = 'ghost' | 'solid' | 'outline' | 'icon'
export type ButtonSize = 'sm' | 'md'
export type ButtonLook = {
  variant?: ButtonVariant
  size?: ButtonSize
  active?: boolean
  block?: boolean
}

const LOOK = {
  ghost: 'text-muted hover:bg-soft hover:text-ink',
  solid: 'bg-brand text-white hover:bg-ink',
  outline: 'border border-line-strong bg-paper text-ink hover:bg-soft',
  icon: 'text-muted hover:bg-soft hover:text-ink',
}

export function buttonClass({ variant = 'ghost', size = 'md', active, block }: ButtonLook = {}) {
  return [
    'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-control font-medium disabled:cursor-not-allowed disabled:opacity-40',
    variant === 'icon'
      ? 'size-9 shrink-0 text-sm'
      : size === 'sm'
        ? 'min-h-8 px-3 py-1 text-xs'
        : 'min-h-9 px-4 py-2 text-sm',
    active ? 'bg-brand-soft text-brand border border-line-strong' : LOOK[variant],
    block ? 'w-full' : '',
  ]
    .filter(Boolean)
    .join(' ')
}
