import { useEffect, useState } from 'react'

/**
 * Reactive CSS media query for JS-driven responsive layout (the fleet pattern
 * for shells that must mount DIFFERENT DOM per breakpoint — class variants
 * alone can't avoid double-mounted subtrees, and `max-*:` variant support is
 * unreliable in this app's Tailwind compile).
 *
 * SSR-safe: defaults to false before mount when `window` is unavailable.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent): void => setMatches(e.matches)
    setMatches(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export default useMediaQuery
