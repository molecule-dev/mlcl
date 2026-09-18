import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated creator dashboard shell — sidebar nav with creator-side
 * destinations (Dashboard, Products, Sales, Library, Orders, Settings)
 * plus user menu in the footer slot.
 *
 * Translated from personal-finance/AppLayout + the SidebarLayout chrome
 * package.
 */
export function DigitalGoodsStoreLayout() {
  const { t } = useTranslation()
  const navItems = [
    {
      to: '/dashboard',
      key: 'dashboard',
      icon: 'space_dashboard',
      label: t('nav.dashboard', {}, { defaultValue: 'Dashboard' }),
    },
    {
      to: '/products',
      key: 'products',
      icon: 'inventory_2',
      label: t('nav.products', {}, { defaultValue: 'Products' }),
    },
    {
      to: '/sales',
      key: 'sales',
      icon: 'point_of_sale',
      label: t('nav.sales', {}, { defaultValue: 'Sales' }),
    },
    {
      to: '/library',
      key: 'library',
      icon: 'folder_special',
      label: t('nav.library', {}, { defaultValue: 'Library' }),
    },
    {
      to: '/orders',
      key: 'orders',
      icon: 'receipt_long',
      label: t('nav.orders', {}, { defaultValue: 'Orders' }),
    },
    {
      to: '/settings',
      key: 'settings',
      icon: 'tune',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
    },
  ]
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('nav.creatorAria', {}, { defaultValue: 'Creator dashboard' })}
      dataMolId="dgs-layout"
    />
  )
}

export default DigitalGoodsStoreLayout
