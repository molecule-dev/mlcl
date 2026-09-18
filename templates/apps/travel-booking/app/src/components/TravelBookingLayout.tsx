/**
 * Sojourn travel-booking shell — top-nav layout consumed by every authed
 * route (Search/Trips/Favorites/Notifications/Account). Delegates to the
 * Sweep 1 `@molecule/app-top-nav-layout-react` package, supplying the
 * brand-specific nav items (Search, Trips, Favorites, Notifications) and
 * the bespoke `UserMenu` slot.
 *
 * Translated from hotel-booking's SojournLayout.tsx — same nav rhythm,
 * but `Search` is the primary call-to-action because travel-booking's
 * funnel begins with discovery rather than with a destination already
 * picked.
 */

import { useTranslation } from '@molecule/app-react'
import { TopNavLayout } from '@molecule/app-top-nav-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'travel_explore' },
  { to: '/trips', key: 'trips', defaultLabel: 'Trips', icon: 'luggage' },
  { to: '/favorites', key: 'favorites', defaultLabel: 'Favorites', icon: 'favorite' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
] as const

export function TravelBookingLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`travelBookingLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <TopNavLayout
      appName={APP_NAME}
      logoTo="/"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'travelBookingLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
