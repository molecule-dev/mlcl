import { Outlet } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { NoshSidebar } from './NoshSidebar.js'

/**
 * Layout wrapper for Nosh's signed-in routes.
 *
 * Renders the brand sidebar on the left and an offset main canvas on the
 * right (Outlet). Pages render their own NoshTopBar inside the canvas so
 * each screen controls its own title/actions.
 */
export function NoshAppShell() {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <NoshSidebar />
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
