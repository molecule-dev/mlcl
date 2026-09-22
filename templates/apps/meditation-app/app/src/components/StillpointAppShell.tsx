import { Outlet } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { useIsMobile } from '../lib/use-is-mobile.js'
import { StillpointMobileNav } from './StillpointMobileNav.js'
import { StillpointSidebar } from './StillpointSidebar.js'

/**
 * Layout wrapper for Stillpoint's signed-in routes.
 *
 * Desktop (≥768px): brand sidebar on the left and an offset main canvas on
 * the right (Outlet). Pages render their own StillpointTopBar inside the
 * canvas so each screen controls its own title/actions.
 *
 * Mobile (<768px): the sidebar is not rendered and StillpointMobileNav takes
 * over — a sticky top bar + slide-in drawer, so every route stays reachable
 * on a phone.
 *
 * Translated from calorie-counter's NoshAppShell.tsx.
 */
export function StillpointAppShell() {
  const cm = getClassMap()
  const isMobile = useIsMobile()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <StillpointSidebar />
      {isMobile ? <StillpointMobileNav /> : null}
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 4),
          'md:ml-[240px] md:p-8 min-h-screen tabular-nums',
        )}
      >
        <Outlet />
      </main>
    </div>
  )
}
