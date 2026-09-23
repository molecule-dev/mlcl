import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { AuctionMobileShell } from './AuctionMobileShell.js'
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
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`auctionPlatformLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  // Below md (768px) the fixed 240px sidebar rail would crush a phone's
  // content column, so the template-local mobile shell (sticky top bar +
  // slide-in drawer) renders INSTEAD of the shared sidebar — conditionally
  // rendered via matchMedia, never CSS-hidden (no duplicated data-mol-ids).
  // min-w-0 on the popover root lets the account card truncate inside the
  // narrow top bar instead of clipping past the viewport edge.
  if (isMobile) {
    return (
      <AuctionMobileShell
        navItems={navItems}
        userMenu={<UserMenu className="min-w-0 max-w-full" />}
      />
    )
  }

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
