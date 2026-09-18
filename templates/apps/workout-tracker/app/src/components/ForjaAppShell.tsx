import { Outlet } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { useWeightPreference } from '../lib/weight.js'
import { ForjaSidebar } from './ForjaSidebar.js'

/**
 * Layout wrapper for Forja's signed-in routes.
 *
 * Renders the dark accent sidebar on the left and an offset main canvas
 * on the right (Outlet). Pages render their own ForjaTopBar inside the
 * canvas so each screen controls its own title and actions.
 *
 * Translated from calorie-counter's NoshAppShell.tsx.
 */
export function ForjaAppShell() {
  const cm = getClassMap()
  // Load the weight-unit preference once for the whole signed-in tree; this
  // re-renders the pages when it resolves so kg/lbs displays pick it up.
  useWeightPreference()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <ForjaSidebar />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 4),
          'md:ml-[260px] md:p-8 min-h-screen tabular-nums max-w-[1200px]',
        )}
      >
        <Outlet />
      </main>
    </div>
  )
}
