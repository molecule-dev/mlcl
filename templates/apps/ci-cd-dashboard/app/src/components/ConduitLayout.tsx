import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/pipelines', key: 'pipelines', defaultLabel: 'Pipelines', icon: 'play_circle' },
  { to: '/repositories', key: 'repositories', defaultLabel: 'Repositories', icon: 'inventory_2' },
  { to: '/environments', key: 'environments', defaultLabel: 'Environments', icon: 'cloud' },
  { to: '/artifacts', key: 'artifacts', defaultLabel: 'Artifacts', icon: 'package_2' },
  { to: '/insights', key: 'insights', defaultLabel: 'Insights', icon: 'bar_chart' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function ConduitLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`conduitLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/pipelines"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('conduitLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
