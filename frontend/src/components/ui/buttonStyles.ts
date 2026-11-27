export type ButtonVariant = 'ghost' | 'solid' | 'outline' | 'icon'
export type ButtonSize = 'sm' | 'md'
export type ButtonLook = {
  variant?: ButtonVariant
  size?: ButtonSize
  active?: boolean
  block?: boolean
}

// 胶囊按钮：实心为近黑，次级为浅灰填充，幽灵按钮只在悬停时出底色
const LOOK = {
  ghost: 'text-ink/75 hover:bg-black/[0.05] hover:text-ink',
  solid: 'bg-brand text-white shadow-[0_1px_2px_rgb(0_0_0/0.14)] hover:bg-dark',
  outline: 'bg-black/[0.05] text-ink hover:bg-black/[0.09]',
  icon: 'text-ink/75 hover:bg-black/[0.05] hover:text-ink',
}

export function buttonClass({ variant = 'ghost', size = 'md', active, block }: ButtonLook = {}) {
  return [
    'relative inline-flex select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full font-medium tracking-[-0.01em] disabled:cursor-not-allowed disabled:opacity-35',
    variant === 'icon'
      ? 'size-8 shrink-0 text-sm'
      : size === 'sm'
        ? 'min-h-8 px-3.5 py-1 text-[13px]'
        : 'min-h-10 px-5 py-2 text-sm',
    active ? 'bg-brand text-white shadow-[0_1px_2px_rgb(0_0_0/0.14)]' : LOOK[variant],
    block ? 'w-full' : '',
  ]
    .filter(Boolean)
    .join(' ')
}
