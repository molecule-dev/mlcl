import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/tree', key: 'tree', defaultLabel: 'Tree', icon: 'account_tree' },
  { to: '/people', key: 'people', defaultLabel: 'People', icon: 'groups' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function BranchesLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`branchesLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/tree"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('branchesLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
      sidebarWidthClass="w-64"
    />
  )
}
