/**
 * Authenticated app shell for Morsel — sticky top-nav with brand mark
 * in `DM Serif Display`, four primary nav items (Discover, Favorites,
 * Lists, Notifications) with Material Symbols glyphs, and a UserMenu
 * slot on the right.
 *
 * Translated from hotel-booking's SojournLayout.tsx (TopNavLayout
 * primitive composition) — same chrome shape, but the nav items map to
 * Morsel's screen-map: Discover (browse), Lists (curated stacks),
 * Favorites (saved places), Notifications (helpful + follow activity).
 */

import { useTranslation } from '@molecule/app-react'
import { TopNavLayout } from '@molecule/app-top-nav-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/discover', key: 'discover', defaultLabel: 'Discover', icon: 'explore' },
  { to: '/favorites', key: 'favorites', defaultLabel: 'Favorites', icon: 'favorite' },
  { to: '/lists', key: 'lists', defaultLabel: 'Lists', icon: 'bookmarks' },
  { to: '/notifications', key: 'notifications', defaultLabel: 'Activity', icon: 'notifications' },
] as const

export function RestaurantReviewLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`restaurantReviewLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <TopNavLayout
      appName={APP_NAME}
      logoTo="/discover"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'restaurantReviewLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
