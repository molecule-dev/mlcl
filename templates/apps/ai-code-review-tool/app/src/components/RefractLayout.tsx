import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Refract sidebar shell — left vertical nav + outlet for authed routes.
 *
 * Translated from api-documentation's PrismLayout pattern (dev-tools
 * sibling) — same SidebarLayout primitive, recoloured per Refract's
 * violet/cyan dev-tools palette via the design tokens in theme.css.
 */
const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/repos', key: 'repositories', defaultLabel: 'Repositories', icon: 'storage' },
  { to: '/history', key: 'history', defaultLabel: 'Review History', icon: 'rate_review' },
  { to: '/rules', key: 'rules', defaultLabel: 'Rules', icon: 'gavel' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'analytics' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function RefractLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`refractLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <UserMenu />
          <div className={cm.cn(cm.flex({ justify: 'end' }))}>
            <ThemeToggle />
          </div>
        </div>
      }
      navAriaLabel={t('refractLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
