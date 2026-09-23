import { createContext, useContext } from 'react'

/**
 * Wiring between the signed-in shell's mobile drawer and its trigger.
 *
 * Below the `md` breakpoint the persistent sidebar is hidden, so the sticky
 * top bar renders a hamburger button (see `AiImageGeneratorTopBar`) that
 * opens the drawer (`AiImageGeneratorMobileNav`, rendered by
 * `AiImageGeneratorLayout`). The context carries the open-state setter down
 * to the button without threading props through every page.
 */
export interface MobileNavContextValue {
  openMobileNav: () => void
}

export const MobileNavContext = createContext<MobileNavContextValue>({
  openMobileNav: () => {},
})

export function useMobileNav(): MobileNavContextValue {
  return useContext(MobileNavContext)
}
