import { useEffect, useRef } from 'react'

type Tone = 'ink' | 'paper'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  alpha: number
  phase: number
  depth: number
}

const RGB: Record<Tone, string> = { ink: '29, 29, 31', paper: '245, 245, 247' }
// 每 9000 平方像素一颗，再乘 density；上限控制连线的两两计算量
const AREA_PER_PARTICLE = 9000
const MAX_PARTICLES = 150
const LINK_DISTANCE = 120
const POINTER_RADIUS = 150

/**
 * 背景粒子：缓慢漂移的细点，相互靠近时连出淡线，鼠标附近的粒子被轻轻推开并与光标相连。
 * 纯装饰，不接收指针事件；离开视口或标签页隐藏时暂停，减少动态效果时只画一帧。
 */
export default function ParticleField({
  tone = 'ink',
  density = 1,
  linkOpacity = 0.14,
  className = '',
}: {
  tone?: Tone
  density?: number
  linkOpacity?: number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rgb = RGB[tone]
    const pointer = { x: 0, y: 0, active: false }
    let particles: Particle[] = []
    let width = 0
    let height = 0
    let frame = 0
    let inView = true
    let last = 0

    const seed = () => {
      const count = Math.round(
        Math.min(MAX_PARTICLES, Math.max(16, ((width * height) / AREA_PER_PARTICLE) * density)),
      )
      particles = Array.from({ length: count }, () => {
        const depth = Math.random()
        const speed = 0.08 + depth * 0.22
        const angle = Math.random() * Math.PI * 2
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: 0.6 + depth * 1.5,
          alpha: 0.16 + depth * 0.4,
          phase: Math.random() * Math.PI * 2,
          depth,
        }
      })
    }

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height)
      ctx.lineWidth = 0.6

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 > LINK_DISTANCE * LINK_DISTANCE) continue
          const fade = 1 - Math.sqrt(d2) / LINK_DISTANCE
          ctx.strokeStyle = `rgba(${rgb}, ${fade * linkOpacity})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      for (const p of particles) {
        let glow = 0
        if (pointer.active) {
          const d = Math.hypot(p.x - pointer.x, p.y - pointer.y)
          if (d < POINTER_RADIUS) {
            glow = 1 - d / POINTER_RADIUS
            ctx.strokeStyle = `rgba(${rgb}, ${glow * linkOpacity * 2.8})`
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(pointer.x, pointer.y)
            ctx.stroke()
          }
        }
        const twinkle = 0.72 + 0.28 * Math.sin(time * 0.0011 + p.phase)
        ctx.fillStyle = `rgba(${rgb}, ${Math.min(1, p.alpha * twinkle + glow * 0.35)})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r + glow * 0.8, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const step = (now: number) => {
      const dt = Math.min(3, (now - last) / 16.67)
      last = now
      const margin = 12
      for (const p of particles) {
        if (pointer.active) {
          const dx = p.x - pointer.x
          const dy = p.y - pointer.y
          const d = Math.hypot(dx, dy)
          if (d > 0.1 && d < POINTER_RADIUS) {
            const push = (1 - d / POINTER_RADIUS) * (0.5 + p.depth) * 0.9 * dt
            p.x += (dx / d) * push
            p.y += (dy / d) * push
          }
        }
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.x < -margin) p.x = width + margin
        else if (p.x > width + margin) p.x = -margin
        if (p.y < -margin) p.y = height + margin
        else if (p.y > height + margin) p.y = -margin
      }
      draw(now)
      frame = requestAnimationFrame(step)
    }

    const start = () => {
      if (frame || reduceMotion || !inView || document.hidden) return
      last = performance.now()
      frame = requestAnimationFrame(step)
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === width && rect.height === height) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
      draw(performance.now())
    }

    // 画布不接收事件，改在窗口上听指针，再换算成画布内坐标；触屏不做交互
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const rect = canvas.getBoundingClientRect()
      pointer.x = event.clientX - rect.left
      pointer.y = event.clientY - rect.top
      pointer.active =
        pointer.x >= 0 && pointer.y >= 0 && pointer.x <= rect.width && pointer.y <= rect.height
    }
    const onPointerLeave = () => {
      pointer.active = false
    }
    const onVisibility = () => (document.hidden ? stop() : start())

    const resizer = new ResizeObserver(resize)
    resizer.observe(canvas)
    const viewport = new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting)
      if (inView) start()
      else stop()
    })
    viewport.observe(canvas)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibility)

    resize()
    start()
    canvas.dataset.ready = 'true'

    return () => {
      stop()
      resizer.disconnect()
      viewport.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      document.documentElement.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [tone, density, linkOpacity])

  return <canvas ref={ref} className={`particle-field ${className}`} aria-hidden />
}
