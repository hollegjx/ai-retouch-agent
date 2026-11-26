import { useEffect, useState } from 'react'
import type { RunStatus } from '@/types/runs'

/** 只在服务端已报告的进度之间缓动，不用预估耗时制造进度。 */
export function useSmoothedProgress({
  reported,
  status,
  token,
}: {
  reported: number
  status: RunStatus | undefined
  token: string | null
}) {
  const [shown, setShown] = useState({ token, value: reported })
  const target = Math.max(0, Math.min(100, status === 'succeeded' ? 100 : reported))
  useEffect(() => {
    let frame = 0
    let alive = true
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tick = () => {
      if (!alive) return
      if (reduceMotion) {
        setShown({ token, value: target })
        return
      }
      setShown((current) => {
        const value = current.token === token ? current.value : 0
        const next = Math.abs(target - value) < 1 ? target : value + (target - value) * 0.25
        return { token, value: next }
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const stop = window.setTimeout(() => {
      alive = false
      cancelAnimationFrame(frame)
      setShown({ token, value: target })
    }, 160)
    return () => {
      alive = false
      cancelAnimationFrame(frame)
      window.clearTimeout(stop)
    }
  }, [token, target])
  return Math.round(shown.token === token ? shown.value : 0)
}
