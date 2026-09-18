import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Plume sidebar shell for all signed-in pages.
 *
 * Wraps @molecule/app-sidebar-layout-react with Plume's editorial nav
 * (Dashboard, Documents, Templates, Analytics, Settings, Profile, Billing).
 *
 * Translated from banking-dashboard's MeridianLayout.tsx.
 */
const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/documents', key: 'documents', defaultLabel: 'Documents', icon: 'menu_book' },
  { to: '/templates', key: 'templates', defaultLabel: 'Templates', icon: 'auto_stories' },
  { to: '/image-generator', key: 'imageGenerator', defaultLabel: 'Image Generator', icon: 'image' },
  { to: '/analytics', key: 'analytics', defaultLabel: 'Analytics', icon: 'query_stats' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/billing', key: 'billing', defaultLabel: 'Billing', icon: 'receipt_long' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function PlumeSidebarLayout() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`plumeSidebarLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <div className={cm.cn(cm.flex({ justify: 'end' }))}>
            <ThemeToggle />
          </div>
          <UserMenu />
        </div>
      }
      navAriaLabel={t(
        'plumeSidebarLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
