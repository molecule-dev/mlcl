import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/home', key: 'home', defaultLabel: 'Today', icon: 'newspaper' },
  { to: '/topics', key: 'topics', defaultLabel: 'Topics', icon: 'category' },
  { to: '/sources', key: 'sources', defaultLabel: 'Sources', icon: 'rss_feed' },
  { to: '/saved', key: 'saved', defaultLabel: 'Saved', icon: 'bookmark' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Vantage app shell — left sidebar with editorial nav links, scrollable main
 * pane on the right (rendered by SidebarLayout's internal <Outlet />).
 *
 * Translated from banking-dashboard's MeridianLayout pattern.
 */
export function NewsAggregatorLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`newsAggregatorLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/home"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'newsAggregatorLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
