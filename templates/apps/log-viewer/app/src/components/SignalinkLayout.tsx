import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated shell — vertical sidebar nav covering every screen in
 * `screen-map.json`, brand wordmark, bottom user-menu slot. Built on
 * @molecule/app-sidebar-layout-react (the always-available chrome
 * package) so we get the polished aside + main + outlet wiring for free.
 *
 * Mirrors ci-cd-dashboard's ConduitLayout; nav items track DESIGN.md's
 * primary IA: dashboard, search, traces, streams, alerts, incidents,
 * services, saved, settings.
 */

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'space_dashboard' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/traces', key: 'traces', defaultLabel: 'Traces', icon: 'timeline' },
  { to: '/streams', key: 'streams', defaultLabel: 'Streams', icon: 'stream' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'notifications_active' },
  { to: '/incidents', key: 'incidents', defaultLabel: 'Incidents', icon: 'whatshot' },
  { to: '/services', key: 'services', defaultLabel: 'Services', icon: 'hub' },
  { to: '/saved', key: 'saved', defaultLabel: 'Saved', icon: 'bookmark' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function SignalinkLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`signalinkLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'signalinkLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
