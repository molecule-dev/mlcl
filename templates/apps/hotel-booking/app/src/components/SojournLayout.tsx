import { useTranslation } from '@molecule/app-react'
import { TopNavLayout } from '@molecule/app-top-nav-layout-react'
import { LanguagePicker } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
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

export function SojournLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`sojournLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <TopNavLayout
      appName={APP_NAME}
      logoTo="/"
      navItems={navItems}
      userMenu={
        <>
          <ThemeToggle />
          <LanguagePicker display="icon" />
          <UserMenu />
        </>
      }
      navAriaLabel={t('sojournLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
