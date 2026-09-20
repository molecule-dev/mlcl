/**
 * Auth'd app shell — top-nav layout consuming `@molecule/app-top-nav-layout-react`
 * with MetroPulse's primary navigation: Nearby · Plan · Alerts · Saved · Settings.
 *
 * Same TopNavLayout recipe as the donor's search layout; nav items remapped
 * to the screen-map.json auth'd routes.
 */

import { useTranslation } from '@molecule/app-react'
import { TopNavLayout } from '@molecule/app-top-nav-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/nearby', key: 'nearby', defaultLabel: 'Nearby', icon: 'near_me' },
  { to: '/plan', key: 'plan', defaultLabel: 'Plan', icon: 'route' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'notifications_active' },
  { to: '/saved', key: 'saved', defaultLabel: 'Saved', icon: 'bookmark' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function TransitLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`transitLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <TopNavLayout
      appName={APP_NAME}
      logoTo="/nearby"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('transitLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
