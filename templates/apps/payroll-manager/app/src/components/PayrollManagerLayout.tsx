import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

/**
 * Stipend shell — deep-navy brand-anchored sidebar (per DESIGN.md) around
 * the shared `ResponsiveAppShell`: a mobile-only top bar (brand + user menu
 * + the shell's own menu trigger), a ≥md sidebar with the brand row leading
 * the nav and the user menu in its footer, a <md dialog drawer carrying the
 * SAME nav (only the mounted breakpoint instantiates it), and one
 * `<Outlet />` so pages mount exactly once at any width.
 *
 * The shell owns the breakpoint, the drawer open state, focus/Escape/
 * backdrop handling, root direction, and the auto-close-on-navigation; this
 * component only supplies nav + brand. The navy sidebar treatment is kept
 * via a background class on the shell's sidebar/drawer/top-bar (the same
 * mechanism the fleet uses for tinted shells).
 */

interface NavItem {
  to: string
  key: string
  defaultLabel: string
  icon: string
  accent?: boolean
}

const NAV_KEYS: ReadonlyArray<NavItem> = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/employees', key: 'employees', defaultLabel: 'Employees', icon: 'group' },
  { to: '/pay-runs', key: 'payRuns', defaultLabel: 'Pay runs', icon: 'event_available' },
  {
    to: '/run-payroll',
    key: 'runPayroll',
    defaultLabel: 'Run payroll',
    icon: 'play_circle',
    accent: true,
  },
  { to: '/taxes', key: 'taxes', defaultLabel: 'Tax center', icon: 'receipt_long' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'insights' },
  { to: '/audit-log', key: 'auditLog', defaultLabel: 'Audit log', icon: 'shield' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
]

/** Navy brand row — icon roundel + app name, links to the dashboard. */
function BrandRow({ size }: { size: 'sidebar' | 'drawer' }) {
  const cm = getClassMap()
  return (
    <Link
      to="/dashboard"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 2),
        size === 'sidebar' ? cm.sp('py', 3) : 'py-2',
        'text-white',
      )}
    >
      <BrandWordmark as="span" size={size === 'sidebar' ? 'md' : 'sm'} invert />
    </Link>
  )
}

export function PayrollManagerLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (the old CSS-hidden shell
  // pair used NavLink's prefix matching per copy; the shared element needs
  // one resolved `aria-current` for both breakpoints).
  const activeKey = NAV_KEYS.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = NAV_KEYS.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  const navLabel = t(
    'payrollManagerLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same array, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close.
  const navItems = NAV_KEYS.map((item) => {
    const isActive = item.key === activeKey
    return (
      <NavLink
        key={item.key}
        to={item.to}
        aria-current={isActive ? 'page' : undefined}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          'rounded-lg transition-all duration-150',
          isActive ? 'font-bold text-white' : 'font-medium text-slate-400 hover:text-white',
        )}
        style={{ backgroundColor: isActive ? 'var(--color-sidebar-active)' : 'transparent' }}
      >
        <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')} aria-hidden="true">
          {item.icon}
        </span>
        <span>
          {t(`payrollManagerLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
        </span>
        {item.accent ? (
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.fontWeight('bold'),
              'ml-auto rounded-full text-[9px] uppercase tracking-widest',
            )}
            style={{
              backgroundColor: 'var(--mol-color-secondary-dark)',
              color: 'var(--color-sidebar-text-active)',
            }}
          >
            {t('payrollManagerLayout.runBadge', {}, { defaultValue: 'Now' })}
          </span>
        ) : null}
      </NavLink>
    )
  })

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/* Mobile top bar (< md) — the sidebar's brand + user menu, sticky. The
          shell renders the menu trigger itself. */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        className="bg-[var(--color-sidebar)] border-outline-variant/40"
        brand={<BrandRow size="drawer" />}
        actions={<UserMenu />}
      />

      {/* Desktop sidebar (>= md) — brand row leads the nav column (the shared
          Sidebar has no header slot, so it rides inside children). */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        className={cm.cn(cm.sp('p', 4), 'bg-[var(--color-sidebar)]')}
      >
        <div className={cm.cn(cm.sp('mb', 4))}>
          <BrandRow size="sidebar" />
        </div>
        {navItems}
      </ResponsiveAppShell.Sidebar>

      {/* Mobile drawer (< md) — the same nav over the navy brand, with the
          user menu in the footer so every destination stays reachable. */}
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        className="h-full bg-[var(--color-sidebar)]"
        header={<BrandRow size="drawer" />}
        footer={<UserMenu />}
      >
        {navItems}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
