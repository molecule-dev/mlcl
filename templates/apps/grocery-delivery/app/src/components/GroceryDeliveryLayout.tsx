import { useTranslation } from '@molecule/app-react'
import { TopNavLayout } from '@molecule/app-top-nav-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/shop', key: 'shop', defaultLabel: 'Shop', icon: 'storefront' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/lists', key: 'lists', defaultLabel: 'Lists', icon: 'list_alt' },
  { to: '/orders', key: 'orders', defaultLabel: 'Orders', icon: 'receipt_long' },
  { to: '/cart', key: 'cart', defaultLabel: 'Cart', icon: 'shopping_cart' },
] as const

export function GroceryDeliveryLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`groceryDeliveryLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <TopNavLayout
      appName={APP_NAME}
      logoTo="/shop"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'groceryDeliveryLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
