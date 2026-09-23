import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { Outlet } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { AiImageGeneratorMobileNav, AiImageGeneratorSidebar } from './AiImageGeneratorSidebar.js'
import { MobileNavContext } from './mobile-nav-context.js'

export interface AiImageGeneratorLayoutProps {
  /** Optional override for content; if omitted the router `<Outlet>` is rendered. */
  children?: ReactNode
}

/**
 * Signed-in shell — sidebar + scrollable content column on md+; below the
 * `md` breakpoint the rail is hidden and the sticky top bar's hamburger
 * opens the navigation drawer (fleet mobile-shell pattern). Pages render
 * their own `AiImageGeneratorTopBar` so each route controls its title,
 * subtitle and actions independently.
 */
export function AiImageGeneratorLayout({ children }: AiImageGeneratorLayoutProps) {
  const cm = getClassMap()
  const [navOpen, setNavOpen] = useState(false)
  const closeNav = useCallback(() => setNavOpen(false), [])
  const mobileNav = useMemo(() => ({ openMobileNav: () => setNavOpen(true) }), [])

  return (
    <MobileNavContext.Provider value={mobileNav}>
      <div
        className={cm.cn(cm.flex({}), cm.minH('screen'), 'bg-surface text-on-surface antialiased')}
      >
        <AiImageGeneratorSidebar />
        <AiImageGeneratorMobileNav open={navOpen} onClose={closeNav} />
        <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 md:ml-64 min-w-0')}>
          {children ?? <Outlet />}
        </div>
      </div>
    </MobileNavContext.Provider>
  )
}
