/**
 * Alcove top-nav layout wrapper. Delegates to the Sweep 1
 * `<TopNavLayout>` package and supplies the in-app primary nav set
 * (Search / Reservations / Favorites / Messages / Notifications).
 *
 * Translated from hotel-booking's SojournLayout.tsx — same Sweep-1
 * delegation pattern with a venue-bookings-specific nav set.
 */

import { useTranslation } from '@molecule/app-react'
import { TopNavLayout } from '@molecule/app-top-nav-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'travel_explore' },
  { to: '/reservations', key: 'reservations', defaultLabel: 'Reservations', icon: 'event' },
  { to: '/favorites', key: 'favorites', defaultLabel: 'Favorites', icon: 'favorite' },
  { to: '/messages', key: 'messages', defaultLabel: 'Messages', icon: 'forum' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
] as const

export function AlcoveLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`alcoveLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <TopNavLayout
      appName={APP_NAME}
      logoTo="/"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('alcoveLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
