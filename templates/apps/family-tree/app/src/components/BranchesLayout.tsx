import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/tree', key: 'tree', defaultLabel: 'Tree', icon: 'account_tree' },
  { to: '/people', key: 'people', defaultLabel: 'People', icon: 'groups' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

interface BranchesNavItem {
  to: string
  key: string
  icon: string
  label: string
}

/**
 * The nav links, shared by the desktop Sidebar and the mobile Drawer — the
 * shell mounts only the breakpoint's copy, so the `nav-<key>` data-mol-ids
 * are never duplicated in the DOM. Marking the current item is the consumer's
 * job: longest prefix-match (mirroring the shared layout's active resolution)
 * keeps a detail route (/people/<id>) lit.
 */
function BranchesNav({ navItems }: { navItems: ReadonlyArray<BranchesNavItem> }) {
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
export function BranchesLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navItems: ReadonlyArray<BranchesNavItem> = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`branchesLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const nav = <BranchesNav navItems={navItems} />
  const navLabel = t('branchesLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  // Brand block — mounted by the mobile TopBar AND the desktop Sidebar (never
  // simultaneously: the Sidebar is unmounted below 768px and the mobileOnly
  // TopBar returns null above it).
  const brand = (
    <Link to="/tree" className={cm.cn(cm.flex({ align: 'center' }), 'text-on-surface')}>
      <BrandWordmark as="span" />
    </Link>
  )

  return (
    // The old shell rendered a 256px sidebar (`w-64`) — `lg` keeps that width.
    <ResponsiveAppShell sidebarWidth="lg">
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} actions={<UserMenu />} />
      {/* Desktop keeps brand + user affordances in the Sidebar: brand above
          the nav, UserMenu in the shell's bordered footer row. */}
      <ResponsiveAppShell.Sidebar navLabel={navLabel} footer={<UserMenu />}>
        <div className={cm.cn(cm.sp('px', 3), cm.sp('py', 2))}>{brand}</div>
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer navLabel={navLabel} header={<BrandWordmark as="span" />}>
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
