/**
 * Authenticated app shell — the shared `<ResponsiveAppShell>` from
 * `@molecule/app-ui-react` composed with Rapport's teal chrome.
 *
 * The shell owns the responsive split: the Sidebar (brand + nav + user
 * footer) mounts only ≥768px, the Drawer (same nav element, full APG dialog
 * contract — focus trap, escape/backdrop close, auto-close on navigation)
 * only below it, and the TopBar renders the mobile menu trigger itself. The
 * app keeps NO drawer state of its own.
 *
 * Brand placement is fleet-canonical: the brand lives in the Sidebar; the
 * always-mounted TopBar carries the breadcrumbs + page actions (search,
 * notifications, help) which are real functionality on every breakpoint.
 */
import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { DashboardBreadcrumbs, DashboardTopBarActions } from './DashboardTopBar.js'
import { SideNavBrand, SideNavLinks, SideNavUserFooter } from './SideNavBar.js'

interface RapportLayoutProps {
  children: ReactNode
  /** When true, removes the inner padding wrapper (for full-bleed pages like ConversationDetail). */
  bare?: boolean
}

function RapportLayout({ children, bare = false }: RapportLayoutProps) {
  const cm = getClassMap()

  // The SAME nav element for both surfaces — only the mounted breakpoint
  // instantiates it.
  const nav = <SideNavLinks />
  const footer = <SideNavUserFooter />
  const brand = <SideNavBrand />

  return (
    <ResponsiveAppShell
      // 260px — the rail width this app has always used.
      sidebarWidth={260}
      // flex-wrap + w-full on the TopBar: the shell root is a flex ROW on
      // desktop, so the always-mounted bar has to wrap onto its own
      // full-width row or it renders as a squeezed column beside the
      // sidebar (the SiftLayout composition).
      className={cm.cn(
        'flex-wrap bg-background text-on-background antialiased selection:bg-primary selection:text-on-primary',
      )}
    >
      <ResponsiveAppShell.TopBar
        dataMolId="dashboard-topbar"
        className={cm.cn(
          'w-full h-16 px-8',
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          "bg-surface-container-lowest no-border tonal-shift flat no-shadows font-['Inter'] tracking-tight text-primary",
        )}
        brand={<DashboardBreadcrumbs />}
        actions={<DashboardTopBarActions />}
      />
      <ResponsiveAppShell.Sidebar
        className={cm.cn(
          cm.sp('py', 8),
          cm.sp('px', 6),
          "bg-teal-50 dark:bg-teal-950 font-['Inter'] leading-relaxed",
        )}
        footer={footer}
      >
        <div className={cm.sp('mb', 12)}>{brand}</div>
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        className={cm.cn("bg-teal-50 dark:bg-teal-950 font-['Inter']", cm.sp('px', 4))}
        header={brand}
        footer={footer}
      >
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content
        className={bare ? 'h-[calc(100vh-4rem)] overflow-hidden' : undefined}
      >
        {bare ? (
          <div className="h-full overflow-hidden relative">{children}</div>
        ) : (
          <div className={cm.cn(cm.flex1, cm.sp('p', 6), 'overflow-y-auto md:p-8 lg:p-10')}>
            <div className={cm.cn(cm.maxW('[1400px]'), cm.mxAuto, cm.stack(8))}>{children}</div>
          </div>
        )}
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default RapportLayout
export { RapportLayout }
