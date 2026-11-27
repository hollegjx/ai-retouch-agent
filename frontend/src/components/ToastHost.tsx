import { useToasts } from '@/stores/toasts'

export default function ToastHost() {
  const items = useToasts((state) => state.items)
  const dismiss = useToasts((state) => state.dismiss)

  if (items.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-h)+24px)] z-50 flex flex-col items-center gap-2 px-4">
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto flex items-center gap-2 rounded-full text-[13px] font-medium text-white shadow-[0_8px_32px_rgb(0_0_0/0.22)] backdrop-blur-xl ${
            item.action ? 'py-1.5 pr-1.5 pl-5' : 'px-5 py-2.5'
          } ${item.leaving ? 'animate-toast-out' : 'animate-pop'} ${
            item.tone === 'danger' ? 'bg-danger/95' : 'bg-[rgb(29_29_31/0.88)]'
          }`}
        >
          <button type="button" onClick={() => dismiss(item.id)} className="text-left">
            {item.text}
          </button>
          {item.action && (
            <button
              type="button"
              onClick={() => {
                item.action?.run()
                dismiss(item.id)
              }}
              className="rounded-full bg-white/15 px-3.5 py-1.5 hover:bg-white/25"
            >
              {item.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
