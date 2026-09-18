/**
 * App shell — sidebar layout for the auth'd Arbor surface. Delegates to the
 * registered `@molecule/app-sidebar-layout-react` package and supplies the
 * eight HR nav targets.
 *
 * Translated from applicant-tracking's ShortlistLayout.tsx — same chrome
 * package + nav-pattern, with the HR nav set + brand colour.
 */
import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/employees', key: 'employees', defaultLabel: 'Employees', icon: 'group' },
  { to: '/org-chart', key: 'orgChart', defaultLabel: 'Org chart', icon: 'account_tree' },
  { to: '/pto', key: 'pto', defaultLabel: 'Time off', icon: 'calendar_month' },
  { to: '/onboarding', key: 'onboarding', defaultLabel: 'Onboarding', icon: 'task_alt' },
  { to: '/performance', key: 'performance', defaultLabel: 'Performance', icon: 'trending_up' },
  { to: '/documents', key: 'documents', defaultLabel: 'Documents', icon: 'folder_shared' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'bar_chart' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function ArborLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`arborLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('arborLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
