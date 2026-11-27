import { useEffect, useRef } from 'react'

/** 元素进入视口后打上 data-visible，样式里的 .reveal 据此播放一次上浮淡入。 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (typeof IntersectionObserver === 'undefined') {
      element.dataset.visible = 'true'
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        element.dataset.visible = 'true'
        observer.disconnect()
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return ref
}
