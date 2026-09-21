import { Outlet } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { SimmerMobileNav } from './SimmerMobileNav.js'
import { SimmerSidebar } from './SimmerSidebar.js'

/**
 * Layout wrapper for Simmer's signed-in routes.
 *
 * Renders the brand sidebar on the left and an offset main canvas on the
 * right (Outlet). Pages render their own SimmerTopBar inside the canvas so
 * each screen controls its own title/actions. Below md the sidebar is hidden
 * and SimmerMobileNav takes over as the bottom tab bar; main carries matching
 * bottom padding so content is never buried under it.
 */
export function SimmerAppShell() {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <SimmerSidebar />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 4),
          'md:ml-[240px] md:p-8 pb-24 md:pb-8 min-h-screen tabular-nums',
        )}
      >
        <Outlet />
      </main>
      <SimmerMobileNav />
    </div>
  )
}
