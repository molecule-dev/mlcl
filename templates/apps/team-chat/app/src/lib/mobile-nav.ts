import { useEffect, useState } from 'react'

/**
 * Tiny app-local store for the mobile navigation drawer (<768px).
 *
 * The sidebar (SideNavBar) renders inside each page's tree while the toggle
 * button lives in MobileTopBar — different components, no shared parent below
 * the router — so a module-level store with a subscribe-style hook is the
 * simplest correct plumbing (a React context would need every page to wrap
 * its subtree). Desktop (≥768px) never reads this: the sidebar is statically
 * visible there and the toggle button is hidden.
 */
let open = false
const listeners = new Set<(value: boolean) => void>()

function emit(value: boolean): void {
  open = value
  for (const listener of listeners) listener(value)
}

export function setMobileNavOpen(value: boolean): void {
  emit(value)
}

export function toggleMobileNav(): void {
  emit(!open)
}

export function closeMobileNav(): void {
  if (open) emit(false)
}

/** Subscribe the calling component to the drawer's open state. */
export function useMobileNavOpen(): boolean {
  const [value, setValue] = useState(open)
  useEffect(() => {
    listeners.add(setValue)
    return () => {
      listeners.delete(setValue)
    }
  }, [])
  return value
}
