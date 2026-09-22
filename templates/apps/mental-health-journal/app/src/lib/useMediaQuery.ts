import { useEffect, useState } from 'react'

/**
 * Reactive CSS-media-query hook (template-local).
 *
 * The shared SidebarLayout has no mobile collapse, so the app renders a
 * template-local mobile shell below 768px. This hook picks which shell mounts
 * — exactly one renders at a time, so route components (and their data
 * fetches) never run twice the way a CSS-hidden duplicate would.
 *
 * SSR-safe: defaults to matching on first render, then syncs to the real
 * match list. Listener cleanup happens on unmount and on query changes.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const list = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent): void => setMatches(event.matches)
    setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}
