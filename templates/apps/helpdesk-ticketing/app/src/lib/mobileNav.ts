import { useSyncExternalStore } from 'react'

/**
 * Module-level mobile-nav drawer state, shared by every top bar's hamburger
 * button and the drawer rendered inside the (desktop-only) sidebars.
 *
 * A tiny useSyncExternalStore store rather than context: the trigger lives in
 * six different page-level top bars while the drawer itself lives inside
 * SideNavBar / SideNav — threading context through every page would couple
 * pages to shell internals for no gain.
 */

let open = false
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function closeMobileNav(): void {
  if (!open) return
  open = false
  emit()
}

export function toggleMobileNav(): void {
  open = !open
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useMobileNav(): { open: boolean; toggle: () => void; close: () => void } {
  const isOpen = useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  )
  return { open: isOpen, toggle: toggleMobileNav, close: closeMobileNav }
}
