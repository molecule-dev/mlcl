import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { SiftSidebar } from './SiftSidebar.js'
import { SiftTopBar } from './SiftTopBar.js'

interface SiftLayoutProps {
  children: ReactNode
  /** Override breadcrumbs shown in the top bar. */
  crumbs?: { label: string; to?: string }[]
  /** Optional actions rendered on the right of the top bar (e.g. "New rule"). */
  actions?: ReactNode
  /** Hide the search input. */
  hideSearch?: boolean
}

/**
 * Bespoke "Sift" console shell — dark slate sidebar + frosted top bar.
 *
 * Replaces the generic AppLayout for all signed-in pages so every screen
 * inherits the moderation console chrome with breadcrumbs, search, and
 * notifications/profile slots.
 */
export function SiftLayout({ children, crumbs, actions, hideSearch }: SiftLayoutProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(cm.flex({}), cm.minH('screen'), 'bg-background text-on-surface antialiased')}
    >
      <SiftSidebar />
      <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), 'min-w-0')}>
        <SiftTopBar crumbs={crumbs} actions={actions} showSearch={!hideSearch} />
        <main
          className={cm.cn(
            cm.flex1,
            cm.sp('p', 8),
            cm.stack(8),
            'overflow-y-auto max-w-7xl mx-auto w-full',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
