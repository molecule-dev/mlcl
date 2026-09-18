import { useTranslation } from '@molecule/app-react'
import { TopNavLayout } from '@molecule/app-top-nav-layout-react'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/restaurants', key: 'browse', defaultLabel: 'Browse', icon: 'storefront' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/orders', key: 'orders', defaultLabel: 'Orders', icon: 'receipt_long' },
  { to: '/favorites', key: 'favorites', defaultLabel: 'Favorites', icon: 'favorite' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
] as const

export function FoodDeliveryLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`foodDeliveryLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <TopNavLayout
      appName={APP_NAME}
      logoTo="/restaurants"
      navItems={navItems}
      userMenu={
        <>
          <ThemeToggle />
          <UserMenu />
        </>
      }
      navAriaLabel={t(
        'foodDeliveryLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
