import type { ReactNode } from 'react'
import { Outlet, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { DendriteBrand, DendriteNavLinks, DendriteNewMapButton } from './DendriteSideNav.js'
import { UserMenu } from './UserMenu.js'

/**
 * Shell for all authenticated Dendrite screens — the shared
 * {@link ResponsiveAppShell}: brand + nav sidebar (≥768px), a dialog drawer
 * (<768px) fed the SAME nav element so the two navigations cannot drift, and
 * one content column whose pages own their spacing.
 *
 * MOBILE (< md / 768px): a mobile-only top bar carries brand + alerts +
 * account; the shell renders the menu trigger and owns the whole drawer
 * contract (open state, focus trap, Escape, backdrop, body-scroll lock,
 * auto-close on navigation) — the template keeps none of it.
 *
 * DESKTOP (≥ md): the sidebar carries the brand (the shared Sidebar has no
 * header slot, so it rides inside children), the nav, and a footer with
 * alerts + account + the "New map" CTA. The old decorative desktop search
 * input had no shell slot and was dropped with the hand-rolled header.
 */
export interface MindMappingLayoutProps {
  children?: ReactNode
}

export function MindMappingLayout({ children }: MindMappingLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const notificationsLabel = t('settings.notifications', {}, { defaultValue: 'Notifications' })

  // ONE nav element for both breakpoints — only the mounted one instantiates.
  const nav = <DendriteNavLinks />
  const newMap = <DendriteNewMapButton />

  // Alerts + account cluster, shared by the mobile top bar and the desktop
  // sidebar footer (only one of the two surfaces mounts per breakpoint).
  const alertsAndAccount = (
    <div
      className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }), cm.w('full'))}
    >
      <button
        type="button"
        onClick={() => navigate('/notifications')}
        aria-label={notificationsLabel}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'w-11 h-11 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors',
        )}
      >
        <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
          notifications
        </span>
      </button>
      <UserMenu />
    </div>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md" className="bg-surface text-on-surface antialiased">
      {/* Mobile top bar (< md): trigger (shell-rendered) + brand + alerts +
          account. The desktop sidebar carries the brand, so the bar mounts
          nowhere else. */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={<DendriteBrand compact />}
        actions={alertsAndAccount}
      />

      {/* Desktop sidebar (≥768px). */}
      <ResponsiveAppShell.Sidebar footer={newMap}>
        <DendriteBrand />
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/* Mobile drawer (< md): same nav element, brand in the header row,
          New map CTA in the footer; close/Escape/backdrop/route-change are
          shell-owned. */}
      <ResponsiveAppShell.Drawer header={<DendriteBrand compact />} footer={newMap}>
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <div className={cm.cn(cm.flex1, cm.stack(8), 'p-4 md:p-8 max-w-[1440px] w-full mx-auto')}>
          {children ?? <Outlet />}
        </div>
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default MindMappingLayout
