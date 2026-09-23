import { useEffect, useState } from 'react'

const QUERY = '(max-width: 767px)'

/**
 * True below the `md` breakpoint (768px). Drives the template-local mobile
 * shell: the fixed sidebar is conditionally REPLACED (never CSS-hidden, so
 * nav data-mol-ids are never duplicated in the DOM) by a sticky top bar +
 * slide-in drawer. SSR-safe: defaults to false until mounted.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent): void => setIsMobile(e.matches)
    setIsMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
