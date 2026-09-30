import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { MobileNavShell } from './MobileNavShell.js'
import { UserMenu } from './UserMenu.js'

/**
 * Vigil's authed shell — vertical sidebar with the SRE nav (Dashboard,
 * Incidents, Components, Maintenance, Subscribers, Notifications, Team,
 * Audit log, Settings) + a bottom UserMenu slot.
 *
 * Uses the shared SidebarLayout package on md+ screens; below md (768px)
 * the fixed 240px rail would crush a phone's content column, so a
 * template-local MobileNavShell (sticky top bar + slide-in drawer) takes
 * over — conditionally rendered, never CSS-hidden, so nav `data-mol-id`s
 * stay unique in the DOM.
 */

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'monitor_heart' },
  { to: '/incidents', key: 'incidents', defaultLabel: 'Incidents', icon: 'warning' },
  { to: '/components', key: 'components', defaultLabel: 'Components', icon: 'lan' },
  { to: '/maintenance', key: 'maintenance', defaultLabel: 'Maintenance', icon: 'build_circle' },
  { to: '/subscribers', key: 'subscribers', defaultLabel: 'Subscribers', icon: 'mail' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/team', key: 'team', defaultLabel: 'Team', icon: 'group' },
  { to: '/audit', key: 'auditLog', defaultLabel: 'Audit log', icon: 'history' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function StatusPageLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`statusPageLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  if (isMobile) {
    return <MobileNavShell logoTo="/dashboard" navItems={navItems} />
  }
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={
        /* Hover-styled chrome wrapper — the menu trigger must not sit bare
           on the sidebar's bordered footer row. */
        <div className="text-on-surface-variant hover:text-on-surface transition-colors">
          <UserMenu />
        </div>
      }
      navAriaLabel={t(
        'statusPageLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
