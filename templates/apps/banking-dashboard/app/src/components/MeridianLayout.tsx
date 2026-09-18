import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/accounts', key: 'accounts', defaultLabel: 'Accounts', icon: 'account_balance_wallet' },
  { to: '/transfers', key: 'transfers', defaultLabel: 'Transfers', icon: 'swap_horiz' },
  { to: '/statements', key: 'statements', defaultLabel: 'Statements', icon: 'description' },
  { to: '/audit', key: 'audit', defaultLabel: 'Audit log', icon: 'shield' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

function SidebarFooter() {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'end' }))}>
        <ThemeToggle />
      </div>
      <UserMenu />
    </div>
  )
}

export function MeridianLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`meridianLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<SidebarFooter />}
      navAriaLabel={t('meridianLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
