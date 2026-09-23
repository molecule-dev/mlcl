/**
 * Alcove layout wrapper. Below `lg` (1024px) a template-local shell
 * (sticky top bar + slide-in drawer) renders INSTEAD of the shared
 * `<TopNavLayout>` — its five labeled nav items need ~830px and overflow
 * a 390px phone (scrollWidth 476) and a 768px tablet (825). Both shells
 * are conditionally RENDERED off matchMedia (never CSS-hidden) so nav
 * landmarks and `data-mol-id`s are never duplicated.
 */

import { useTranslation } from '@molecule/app-react'
import { TopNavLayout } from '@molecule/app-top-nav-layout-react'

import { APP_NAME } from '../branding.js'
import { useMediaQuery } from '../lib/use-is-mobile.js'
import { AlcoveMobileShell } from './AlcoveMobileShell.js'
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
  // The shared top nav (5 labeled items + brand + user menu) needs ~830px:
  // it overflows a 390px phone (scrollWidth 476) AND a 768px tablet (825),
  // so the drawer shell covers everything below `lg` (1024px).
  const isCompact = useMediaQuery('(max-width: 1023.98px)')
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`alcoveLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  const navAriaLabel = t('alcoveLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  if (isCompact) {
    return <AlcoveMobileShell navItems={navItems} userMenu={<UserMenu />} />
  }

  return (
    <TopNavLayout
      appName={APP_NAME}
      logoTo="/"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={navAriaLabel}
    />
  )
}
