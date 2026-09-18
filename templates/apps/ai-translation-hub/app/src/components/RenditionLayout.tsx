import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/projects', key: 'projects', defaultLabel: 'Projects', icon: 'folder_copy' },
  { to: '/glossary', key: 'glossary', defaultLabel: 'Glossary', icon: 'menu_book' },
  { to: '/memory', key: 'memory', defaultLabel: 'Translation memory', icon: 'storage' },
  { to: '/review', key: 'review', defaultLabel: 'Review queue', icon: 'rule' },
  { to: '/team', key: 'team', defaultLabel: 'Team', icon: 'group' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/billing', key: 'billing', defaultLabel: 'Billing', icon: 'credit_card' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function RenditionLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`renditionLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={
        <>
          <div style={{ marginBottom: '0.5rem' }}>
            <ThemeToggle />
          </div>
          <UserMenu />
        </>
      }
      navAriaLabel={t(
        'renditionLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
