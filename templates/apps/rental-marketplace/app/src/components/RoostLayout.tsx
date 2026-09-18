/**
 * Roost top-nav layout consumed by every authed route — Search / Wishlist /
 * Bookings / Messages / Notifications / Settings / Host (with /host
 * sub-routes nested underneath). Delegates to the Sweep 1
 * `@molecule/app-top-nav-layout-react` package.
 *
 * Translated from travel-booking's TravelBookingLayout.tsx — same nav
 * rhythm, but `Search` is the primary entry-point because Roost's funnel
 * begins with discovery (per DESIGN.md §Map-list duality).
 */

import { useTranslation } from '@molecule/app-react'
import { TopNavLayout } from '@molecule/app-top-nav-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'travel_explore' },
  { to: '/bookings', key: 'bookings', defaultLabel: 'Bookings', icon: 'luggage' },
  { to: '/wishlist', key: 'wishlist', defaultLabel: 'Wishlist', icon: 'favorite' },
  { to: '/messages', key: 'messages', defaultLabel: 'Messages', icon: 'forum' },
  { to: '/host', key: 'host', defaultLabel: 'Host', icon: 'cottage' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
] as const

export function RoostLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`roostLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <TopNavLayout
      appName={APP_NAME}
      logoTo="/"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('roostLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
