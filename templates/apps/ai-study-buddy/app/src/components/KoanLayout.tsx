import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/courses', key: 'courses', defaultLabel: 'Courses', icon: 'school' },
  { to: '/flashcards', key: 'flashcards', defaultLabel: 'Flashcards', icon: 'style' },
  { to: '/progress', key: 'progress', defaultLabel: 'Progress', icon: 'insights' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/billing', key: 'billing', defaultLabel: 'Billing', icon: 'workspace_premium' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Vertical sidebar shell for every signed-in Koan page. Brand wordmark +
 * mastery-themed nav + UserMenu. Wraps `@molecule/app-sidebar-layout-react`.
 */
export function KoanLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`koanLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      dataMolId="koan-layout"
      userMenu={
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('koanLayout.theme', {}, { defaultValue: 'Theme' })}
            </span>
            <ThemeToggle />
          </div>
          <UserMenu />
        </div>
      }
      navAriaLabel={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
