import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { SafeLink } from './SafeLink.js'
import { SiftNav, SiftNavFooter } from './SiftNav.js'
import { SiftCrumbs, SiftTopBarActions } from './SiftTopBar.js'

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
 * Bespoke "Sift" console shell — dark slate sidebar + frosted top bar, built
 * on the shared `ResponsiveAppShell`.
 *
 * Replaces the generic AppLayout for all signed-in pages so every screen
 * inherits the moderation console chrome with breadcrumbs, search, and
 * notifications/profile slots. The shell owns the breakpoint split: the
 * Sidebar mounts only ≥768px, the mobile Drawer (same nav element, full
 * dialog contract) only below it, and the TopBar renders the menu trigger
 * itself — the app's own hamburger, drawer state and escape/backdrop
 * handlers are deleted.
 *
 * The TopBar stays on EVERY breakpoint via the shell's wrap-bar layout
 * (`md:flex-wrap` root + `w-full` bar): its breadcrumbs/search/actions are
 * real desktop chrome, so the bar spans its own full-width row ABOVE the
 * sidebar instead of rendering beside it (which the shell suppresses).
 */
export function SiftLayout({ children, crumbs, actions, hideSearch }: SiftLayoutProps) {
  const cm = getClassMap()

  // The SAME nav element for both surfaces — only the mounted breakpoint
  // instantiates it, so the badge fetch runs once on the live surface.
  const nav = <SiftNav />
  const footer = <SiftNavFooter />
  const drawerBrand = <BrandWordmark as="span" invert />

  return (
    <ResponsiveAppShell
      sidebarWidth={260}
      // md:flex-wrap = the shell's wrap-bar layout: the always-mounted TopBar
      // (w-full below) wraps onto its own full-width row ABOVE the sidebar on
      // desktop instead of being suppressed as a squeezed flex-row column.
      className="md:flex-wrap bg-background text-on-surface antialiased"
    >
      <ResponsiveAppShell.TopBar
        className="w-full h-16 bg-surface/80 backdrop-blur-xl border-b border-surface-container shadow-sm shadow-slate-200/40 md:px-8"
        brand={<SiftCrumbs crumbs={crumbs} />}
        actions={<SiftTopBarActions showSearch={!hideSearch} actions={actions} />}
      />
      <ResponsiveAppShell.Sidebar footer={footer}>
        <SiftSidebarBrand />
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer header={drawerBrand} footer={footer}>
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content
        className={cm.cn(cm.sp('p', 8), cm.stack(8), 'overflow-y-auto max-w-7xl mx-auto w-full')}
      >
        {children}
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

/** Sidebar-only brand block (name + tagline) linking home. */
function SiftSidebarBrand() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <SafeLink
      to="/"
      className={cm.cn(cm.sp('px', 4), cm.sp('mb', 8), cm.flex({ direction: 'col' }))}
      aria-label={APP_NAME}
    >
      <BrandWordmark as="span" invert />
      <span
        className={cm.cn(
          'text-secondary-fixed-dim text-[10px] tracking-widest uppercase font-bold mt-1',
        )}
      >
        {t('sidebar.tagline', {}, { defaultValue: 'Content Moderation' })}
      </span>
    </SafeLink>
  )
}
