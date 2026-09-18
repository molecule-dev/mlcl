/**
 * Authenticated app shell — sticky teal SideNavBar + page slot. Mirrors
 * the Dashboard pattern verbatim so every authenticated screen has the
 * same chrome (sidebar + scroll canvas).
 *
 * Pattern source: ai-chatbot-builder's per-page side-nav layout shape
 * (BotsListSideNavBar + scrollable main).
 */
import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import DashboardTopBar from './DashboardTopBar.js'
import SideNavBar from './SideNavBar.js'

interface RapportLayoutProps {
  children: ReactNode
  /** When true, removes the inner padding wrapper (for full-bleed pages like ConversationDetail). */
  bare?: boolean
}

function RapportLayout({ children, bare = false }: RapportLayoutProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex(),
        cm.h('screen'),
        'overflow-hidden antialiased bg-background text-on-background selection:bg-primary selection:text-on-primary',
      )}
    >
      <SideNavBar />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.flex1,
          cm.h('screen'),
          'overflow-hidden relative',
        )}
      >
        <DashboardTopBar />
        {bare ? (
          <div className={cm.cn(cm.flex1, 'overflow-hidden relative')}>{children}</div>
        ) : (
          <div className={cm.cn(cm.flex1, cm.sp('p', 6), 'overflow-y-auto md:p-8 lg:p-10')}>
            <div className={cm.cn(cm.maxW('[1400px]'), cm.mxAuto, cm.stack(8))}>{children}</div>
          </div>
        )}
      </main>
    </div>
  )
}

export default RapportLayout
export { RapportLayout }
