import { useEffect, useState } from 'react'

/**
 * True when the viewport is at or below the fleet mobile breakpoint (768px).
 *
 * Drives the template-local mobile shell: the fixed sidebar becomes a slide-in
 * drawer below 768px, and two-column content grids stack to one column. Matches
 * the fleet pattern (expense-report/EmployeeOnboardingLayout): matchMedia +
 * state, never a CSS-only trick, because the inline-styled grids here need a
 * real value swap.
 */
const MOBILE_MQ = '(max-width: 768px)'

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent): void => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}

export default useIsMobile
