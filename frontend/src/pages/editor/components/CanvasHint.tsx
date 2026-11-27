export default function CanvasHint({ mode, text }: { mode: string; text: string | null }) {
  if (!text) return null

  return (
    <p
      // 按模式换 key：切模式重播入场动画，同一模式内刷新百分比不打断
      key={mode}
      className="animate-pop pointer-events-none absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[rgb(29_29_31/0.82)] px-4 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-[0_8px_24px_rgb(0_0_0/0.18)] backdrop-blur-xl"
    >
      {text}
    </p>
  )
}
