import type { ReactNode } from 'react'
import { useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { SiftMobileNav } from './SiftMobileNav.js'
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
 * notifications/profile slots. Below 768px the sidebar is hidden and the
 * top bar grows a hamburger that opens the SiftMobileNav drawer.
 */
export function SiftLayout({ children, crumbs, actions, hideSearch }: SiftLayoutProps) {
  const cm = getClassMap()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  return (
    <div
      className={cm.cn(cm.flex({}), cm.minH('screen'), 'bg-background text-on-surface antialiased')}
    >
      <SiftSidebar />
      <SiftMobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), 'min-w-0')}>
        <SiftTopBar
          crumbs={crumbs}
          actions={actions}
          showSearch={!hideSearch}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
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
