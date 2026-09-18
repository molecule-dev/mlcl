import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/auctions', key: 'browse', defaultLabel: 'Browse', icon: 'gavel' },
  { to: '/watchlist', key: 'watchlist', defaultLabel: 'Watchlist', icon: 'visibility' },
  { to: '/my-bids', key: 'myBids', defaultLabel: 'My bids', icon: 'how_to_vote' },
  { to: '/seller', key: 'seller', defaultLabel: 'Seller', icon: 'storefront' },
  { to: '/sell/new', key: 'sell', defaultLabel: 'Sell an item', icon: 'add_box' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function AuctionPlatformLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`auctionPlatformLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/auctions"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'auctionPlatformLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
