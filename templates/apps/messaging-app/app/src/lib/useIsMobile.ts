import { useEffect, useState } from 'react'

const QUERY = '(max-width: 767px)'

/**
 * True when the viewport is below the md breakpoint (768px). Below this
 * width the HushLayout sidebar becomes a slide-in drawer opened from the
 * sticky top bar's hamburger button.
 *
 * SSR/test safe: defaults to the live matchMedia value on first render and
 * subscribes to changes so rotating a device updates the layout.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const handler = (e: MediaQueryListEvent): void => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}
