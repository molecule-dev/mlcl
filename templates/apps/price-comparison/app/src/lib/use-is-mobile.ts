import { useEffect, useState } from 'react'

/**
 * matchMedia-driven boolean for a CSS media query. Prefer conditionally
 * RENDERING chrome off this over CSS-hiding it — duplicated nav
 * `data-mol-id`s in the DOM are the bug class that CSS-hiding invites.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(
    (): boolean => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent): void => setMatches(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/** True below the `md` breakpoint (768px) — phone-class layouts. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767.98px)')
}

export default useIsMobile
