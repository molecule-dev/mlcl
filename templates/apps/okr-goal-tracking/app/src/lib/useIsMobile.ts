import { useEffect, useState } from 'react'

/**
 * True below the `md` breakpoint (768px) — the same breakpoint the fleet
 * mobile-shell pattern uses. Conditionally RENDER your mobile chrome with
 * this (not CSS-hidden) so nav landmarks/data-mol-ids are never duplicated
 * in the DOM.
 */
const DESKTOP_QUERY = '(min-width: 768px)'

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && !window.matchMedia(DESKTOP_QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const onChange = (e: MediaQueryListEvent): void => setIsMobile(!e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}
