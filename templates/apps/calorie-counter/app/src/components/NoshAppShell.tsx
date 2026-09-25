import { Outlet } from 'react-router'

import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { NoshBrand, NoshNav, NoshNavFooter } from './NoshSidebar.js'

/**
 * Layout wrapper for Nosh's signed-in routes — the shared `ResponsiveAppShell`.
 *
 * Desktop (≥768px): brand in the sidebar (teal rail, 240px) with the primary
 * nav and a Settings footer; pages render their own NoshTopBar inside the
 * canvas so each screen controls its own title/actions. Below the breakpoint
 * the same nav element mounts inside the drawer (full dialog contract — focus
 * trap, Escape/backdrop close, auto-close on navigation), opened by the
 * trigger the mobile-only top bar renders. The shell owns the breakpoint
 * split, drawer stacking and trigger size — no app-side responsive shims.
 */
export function NoshAppShell() {
  const cm = getClassMap()
  // One element per slot — the shell mounts exactly the breakpoint's copy.
  const nav = <NoshNav />
  const footer = <NoshNavFooter />

  return (
    <ResponsiveAppShell sidebarWidth="md" className="text-on-surface antialiased">
      <ResponsiveAppShell.TopBar mobileOnly brand={<NoshBrand showTagline={false} />} />
      <ResponsiveAppShell.Sidebar
        className="bg-surface-secondary border-primary-container"
        footer={footer}
      >
        <NoshBrand className={cm.sp('mb', 6)} />
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        className="bg-surface-secondary"
        header={<NoshBrand showTagline={false} />}
        footer={footer}
      >
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 4),
          'md:p-8 min-h-screen tabular-nums',
        )}
      >
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
