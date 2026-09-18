import { Outlet } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { StillpointSidebar } from './StillpointSidebar.js'

/**
 * Layout wrapper for Stillpoint's signed-in routes.
 *
 * Renders the brand sidebar on the left and an offset main canvas on the
 * right (Outlet). Pages render their own StillpointTopBar inside the canvas
 * so each screen controls its own title/actions.
 *
 * Translated from calorie-counter's NoshAppShell.tsx.
 */
export function StillpointAppShell() {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <StillpointSidebar />
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
