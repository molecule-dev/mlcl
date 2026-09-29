import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated app shell — the shared `ResponsiveAppShell` composed to the
 * Pylon shape: a mobile-only top bar (brand wordmark + user menu; the shell
 * renders the menu trigger itself), a ≥768px sidebar with the brand row
 * leading the nav column and the user menu in the footer, a <768px dialog
 * drawer over the SAME nav element (only the mounted breakpoint
 * instantiates, so nav `data-mol-id`s are never duplicated), and one
 * `<Outlet />`. The shell owns the breakpoint split, the drawer open state,
 * focus/Escape/backdrop handling, scroll lock, and auto-close-on-navigation.
 */

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'space_dashboard' },
  { to: '/endpoints', key: 'endpoints', defaultLabel: 'Endpoints', icon: 'cloud_sync' },
  { to: '/deliveries', key: 'deliveries', defaultLabel: 'Deliveries', icon: 'send' },
  { to: '/events', key: 'events', defaultLabel: 'Events', icon: 'bolt' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications_active',
  },
  { to: '/audit', key: 'audit', defaultLabel: 'Audit log', icon: 'lock_clock' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Append `#top` to a Link target when it matches the current pathname so
 * clicking a same-route link still produces an observable URL change (the
 * resolution the shared desktop shell used before this migration).
 */
function safeTarget(to: string, pathname: string): string {
  const samePath = pathname === to || pathname + '/' === to
  return samePath ? `${to.replace(/\/$/, '')}#top` : to
}

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mol-color-primary)]'

export function PylonShell() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`pylonShell.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const navAriaLabel = t('pylonShell.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  // Longest-prefix active match — one resolution for both breakpoints.
  const activeKey = NAV_KEYS.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null) return item.key
    const bestItem = NAV_KEYS.find((i) => i.key === best)
    return bestItem && item.to.length > bestItem.to.length ? item.key : best
  }, null)

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close.
  const nav = (
    <>
      {navItems.map((item) => {
        const isActive = item.key === activeKey
        return (
          <Link
            key={item.key}
            to={safeTarget(item.to, pathname)}
            data-mol-id={`nav-${item.key}`}
            aria-current={isActive ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              'min-h-[44px] rounded-lg py-2.5 text-sm font-medium',
              FOCUS_RING,
            )}
            style={
              isActive
                ? {
                    backgroundColor:
                      'color-mix(in srgb, var(--mol-color-primary) 15%, transparent)',
                    color: 'var(--mol-color-primary)',
                    boxShadow:
                      'inset 0 0 0 1px color-mix(in srgb, var(--mol-color-primary) 35%, transparent)',
                  }
                : { color: 'var(--mol-color-text-secondary)' }
            }
          >
            <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </Link>
        )
      })}
    </>
  )

  // The brand wordmark — the shared Sidebar has no header slot, so the
  // desktop brand row rides at the top of its children (the mobile-only
  // TopBar carries its own copy below the breakpoint).
  const brand = (
    <Link to={safeTarget('/dashboard', pathname)}>
      <BrandWordmark as="span" size="md" />
    </Link>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} actions={<UserMenu />} />

      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        footer={<UserMenu />}
        className={cm.sp('p', 4)}
      >
        <div className={cm.sp('mb', 6)}>{brand}</div>
        {nav}
      </ResponsiveAppShell.Sidebar>

      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        // The shared panel ships no height token (its content would size it);
        // `h-full` restores the documented full-height left-panel geometry.
        className="h-full"
        header={brand}
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content className="overflow-y-auto">
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
