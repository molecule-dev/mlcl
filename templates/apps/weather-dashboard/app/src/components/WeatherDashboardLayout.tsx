import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/locations', key: 'locations', defaultLabel: 'Locations', icon: 'location_on' },
  { to: '/radar', key: 'radar', defaultLabel: 'Radar', icon: 'radar' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'warning' },
  { to: '/trends', key: 'trends', defaultLabel: 'Trends', icon: 'trending_up' },
  { to: '/compare', key: 'compare', defaultLabel: 'Compare', icon: 'compare_arrows' },
  { to: '/billing', key: 'billing', defaultLabel: 'Billing', icon: 'payments' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Tempest auth'd shell — vertical SidebarLayout (from
 * @molecule/app-sidebar-layout-react) wrapped around the outlet so each
 * authed page renders inside the dashboard / locations / radar /
 * alerts / trends / compare / settings primary nav.
 *
 * Pattern source: smart-home-dashboard's SmartHomeDashboardLayout.
 */
export function WeatherDashboardLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`weatherDashboardLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  // SidebarLayout already renders the <main> + <Outlet /> internally.
  // Don't wrap a second <main><Outlet /> around it or every page renders twice.
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'weatherDashboardLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
