import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { usePreferences } from '../lib/format.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/budget', key: 'budget', defaultLabel: 'Budget', icon: 'savings' },
  { to: '/accounts', key: 'accounts', defaultLabel: 'Accounts', icon: 'account_balance_wallet' },
  { to: '/transactions', key: 'transactions', defaultLabel: 'Transactions', icon: 'receipt_long' },
  { to: '/categories', key: 'categories', defaultLabel: 'Categories', icon: 'category' },
  { to: '/goals', key: 'goals', defaultLabel: 'Goals', icon: 'flag' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'bar_chart' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

interface CofferNavItem {
  to: string
  key: string
  icon: string
  label: string
}

/**
 * The nav links, shared by the desktop Sidebar and the mobile Drawer — the
 * shell mounts only the breakpoint's copy, so the `nav-<key>` data-mol-ids
 * are never duplicated in the DOM. Marking the current item is the consumer's
 * job: longest prefix-match (mirroring the fleet's active resolution) keeps a
 * detail route (/transactions/<id>) lit.
 */
function CofferNav({ navItems }: { navItems: ReadonlyArray<CofferNavItem> }) {
  const cm = getClassMap()
  const { pathname } = useLocation()

  const activeKey = navItems.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null) return item.key
    const bestItem = navItems.find((i) => i.key === best)
    return bestItem && item.to.length > bestItem.to.length ? item.key : best
  }, null)

  return (
    <>
      {navItems.map((item) => {
        const isActive = item.key === activeKey
        return (
          <Link
            key={item.key}
            to={item.to}
            data-mol-id={`nav-${item.key}`}
            aria-current={isActive ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.roundedFull,
              isActive
                ? // The container pair, NOT bgPrimarySubtle + textPrimary —
                  // the brand colour on a 10% tint of itself fails AA.
                  cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                : cm.cn(cm.textMuted, cm.link),
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </>
  )
}

/**
 * Authenticated shell for every signed-in page.
 *
 * The shared ResponsiveAppShell owns the breakpoint split: the Sidebar mounts
 * only ≥768px, the mobile Drawer (same nav element, full dialog contract —
 * focus trap, Escape/backdrop close, scroll lock) only below it, and the
 * TopBar renders the menu trigger itself. Page padding stays inside the
 * pages; `.Content` is a bare `<main>`.
 */
export function CofferLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Load the display-currency preference once for the whole authenticated
  // shell; the money formatters read it synchronously via getCurrency() and
  // re-render when it resolves.
  usePreferences()
  const navItems: ReadonlyArray<CofferNavItem> = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`cofferLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const nav = <CofferNav navItems={navItems} />

  return (
    <ResponsiveAppShell sidebarWidth="md">
      <ResponsiveAppShell.TopBar
        brand={
          <Link
            to="/dashboard"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}
          >
            {APP_NAME}
          </Link>
        }
        actions={<UserMenu />}
      />
      <ResponsiveAppShell.Sidebar>{nav}</ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        header={
          <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {APP_NAME}
          </span>
        }
      >
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
