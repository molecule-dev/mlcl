import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/donors', key: 'donors', defaultLabel: 'Donors', icon: 'favorite' },
  { to: '/gifts', key: 'gifts', defaultLabel: 'Gifts', icon: 'volunteer_activism' },
  { to: '/campaigns', key: 'campaigns', defaultLabel: 'Campaigns', icon: 'flag' },
  { to: '/receipts', key: 'receipts', defaultLabel: 'Receipts', icon: 'receipt_long' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function DonorLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`layout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('layout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
      /* Anchor for the app-shell CSS in index.css: below md the shared
         SidebarLayout renders a fixed-width flex-row sidebar that eats
         ~60% of a 390px screen, so the shell collapses to a top bar there. */
      dataMolId="app-shell"
    />
  )
}
