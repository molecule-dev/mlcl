import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/deals', key: 'deals', defaultLabel: 'Deals', icon: 'local_offer' },
  { to: '/near-me', key: 'near_me', defaultLabel: 'Near me', icon: 'place' },
  { to: '/merchants', key: 'merchants', defaultLabel: 'Merchants', icon: 'storefront' },
  { to: '/my-coupons', key: 'my_coupons', defaultLabel: 'My coupons', icon: 'redeem' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function SnagrLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`snagrLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('snagrLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
