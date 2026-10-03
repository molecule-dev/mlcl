import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

/**
 * App shell for every authenticated route — the shared `ResponsiveAppShell`
 * (`@molecule/app-ui-react`): a mobile-only top bar (<768px; brand, user
 * card, and the shell's own 44px menu trigger), a ≥768px sidebar (brand +
 * nav + user card in the footer row), and a <768px slide-in dialog drawer
 * over the SAME nav element. The shell owns the breakpoint split, the drawer
 * open state, the focus trap, Escape/backdrop close, the body scroll lock
 * and auto-close-on-navigation; the former hand-rolled top bar, backdrop,
 * drawer and their state machine are deleted with it, and exactly one
 * chrome (sidebar or drawer) is mounted per viewport — no CSS-hidden
 * duplicates in the accessibility tree.
 */

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/shipments', key: 'shipments', defaultLabel: 'Shipments', icon: 'local_shipping' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'warning' },
  { to: '/carriers', key: 'carriers', defaultLabel: 'Carriers', icon: 'business' },
  { to: '/analytics', key: 'analytics', defaultLabel: 'Analytics', icon: 'insights' },
  { to: '/webhooks', key: 'webhooks', defaultLabel: 'Webhooks', icon: 'webhook' },
  { to: '/team', key: 'team', defaultLabel: 'Team', icon: 'group' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function WaypointLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (never every ancestor).
  const activeKey = NAV_KEYS.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = NAV_KEYS.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  // Same-route clicks append `#top` so the URL still changes (no dead links).
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  const navAriaLabel = t(
    'waypointLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element, and only the mounted breakpoint instantiates it, so the
  // `nav-*` ids are never duplicated. The drawer closes itself on navigation
  // (shell-owned), so links carry no onClick close.
  const nav = (
    <div className={cm.cn(cm.flex1, cm.stack(1))}>
      {NAV_KEYS.map((item) => {
        const isActive = item.key === activeKey
        return (
          <Link
            key={item.key}
            to={safeTarget(item.to)}
            data-mol-id={`nav-${item.key}`}
            aria-current={isActive ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'min-h-[44px] rounded-full transition-colors',
              isActive
                ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                : cm.cn(cm.textMuted, cm.link),
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
            <span>
              {t(`waypointLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
            </span>
          </Link>
        )
      })}
    </div>
  )

  // BrandWordmark renders its own router link — wrapping it in another
  // <Link> nested an <a> inside an <a> (invalid HTML; React logs it as
  // a console error on every authed page).
  const brand = (
    <div className={cm.cn(cm.sp('mb', 6))}>
      <BrandWordmark to="/dashboard" />
    </div>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md" dataMolId="waypoint-layout">
      {/*
        Mobile top bar (<768px): the shell's menu trigger + brand + user
        card, capped so a long email cannot squeeze the brand out.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <div className="min-w-0 truncate">
            <BrandWordmark to="/dashboard" size="sm" />
          </div>
        }
        actions={
          <div className="max-w-[44vw]">
            <UserMenu />
          </div>
        }
      />

      {/*
        Desktop sidebar (≥768px): brand + nav + the user card in the
        bordered footer row — where the old rail kept it.
      */}
      <ResponsiveAppShell.Sidebar navLabel={navAriaLabel} className={cm.sp('p', 4)}>
        {brand}
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the shell's APG dialog (focus trap, Escape,
        backdrop click, body-scroll lock) over the SAME nav element.
        `h-full` restores the full-height left-panel geometry.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        className="h-full"
        header={<BrandWordmark to="/dashboard" />}
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
