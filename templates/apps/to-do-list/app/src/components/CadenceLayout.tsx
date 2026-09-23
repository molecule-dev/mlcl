import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { CadenceMobileShell } from './CadenceMobileShell.js'
import { GlobalShortcuts } from './GlobalShortcuts.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/today', key: 'today', defaultLabel: 'Today', icon: 'today' },
  { to: '/inbox', key: 'inbox', defaultLabel: 'Inbox', icon: 'inbox' },
  { to: '/upcoming', key: 'upcoming', defaultLabel: 'Upcoming', icon: 'calendar_month' },
  { to: '/projects', key: 'projects', defaultLabel: 'Projects', icon: 'folder' },
  { to: '/labels', key: 'labels', defaultLabel: 'Labels', icon: 'label' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Authenticated shell for every signed-in page.
 *
 * Desktop (>= 768px): the shared SidebarLayout with the cadence nav.
 *
 * Mobile (< 768px): the shared sidebar has no collapse, so a fixed rail would
 * crush a phone's content column to ~150px. A template-local CadenceMobileShell
 * (sticky top bar + slide-in drawer) takes over instead — conditionally
 * RENDERED via matchMedia, never CSS-hidden, so nav `data-mol-id`s are never
 * duplicated in the DOM.
 */
export function CadenceLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`cadenceLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  if (isMobile) {
    return (
      <>
        <GlobalShortcuts />
        <CadenceMobileShell navItems={navItems} />
      </>
    )
  }

  return (
    <>
      <GlobalShortcuts />
      <SidebarLayout
        appName={APP_NAME}
        logoTo="/today"
        navItems={navItems}
        userMenu={<UserMenu />}
        navAriaLabel={t(
          'cadenceLayout.primaryNavLabel',
          {},
          { defaultValue: 'Primary navigation' },
        )}
      />
    </>
  )
}
