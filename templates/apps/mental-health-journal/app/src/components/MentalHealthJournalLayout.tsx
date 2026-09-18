import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Lucid sidebar layout — same shell pattern as habit-tracker/StreakLayout
 * and health-records/MeridianLayout, with nav targets matched to
 * mental-health-journal's screen-map.json.
 */

const NAV_KEYS = [
  { to: '/home', key: 'home', defaultLabel: 'Today', icon: 'today' },
  { to: '/journal', key: 'journal', defaultLabel: 'Journal', icon: 'menu_book' },
  { to: '/insights', key: 'insights', defaultLabel: 'Insights', icon: 'insights' },
  { to: '/calendar', key: 'calendar', defaultLabel: 'Calendar', icon: 'calendar_month' },
  { to: '/prompts', key: 'prompts', defaultLabel: 'Prompts', icon: 'lightbulb' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'account_circle' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function MentalHealthJournalLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`mentalHealthJournalLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/home"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'mentalHealthJournalLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
      sidebarWidthClass="w-60"
    />
  )
}
