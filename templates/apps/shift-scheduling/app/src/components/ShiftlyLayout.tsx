/**
 * App shell for the auth'd Shiftly surface — the SHARED
 * `ResponsiveAppShell` compound from `@molecule/app-ui-react`.
 *
 * The shell owns the breakpoint split (768px, one chrome mounted per
 * breakpoint): the desktop Sidebar + the mobile Drawer (full APG dialog —
 * focus trap, Escape/backdrop close, scroll lock, auto-close on navigation)
 * render the SAME nav element, and the mobile-only TopBar renders the 44px
 * menu trigger itself. The former hand-rolled hamburger/drawer state machine
 * and the desktop-only `SidebarLayout` are deleted with it.
 *
 * Nav targets/labels (i18n), longest-prefix active highlighting,
 * `aria-current="page"`, the `nav-*` data-mol-ids and the UserMenu placement
 * (sidebar footer on desktop; top bar + drawer footer on mobile) are
 * preserved from the previous shell.
 */
import type { ReactElement } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/schedule', key: 'schedule', defaultLabel: 'Schedule', icon: 'calendar_month' },
  { to: '/open-shifts', key: 'openShifts', defaultLabel: 'Open shifts', icon: 'bolt' },
  { to: '/swap-requests', key: 'swapRequests', defaultLabel: 'Swap requests', icon: 'swap_horiz' },
  {
    to: '/availability',
    key: 'availability',
    defaultLabel: 'Availability',
    icon: 'event_available',
  },
  { to: '/staff', key: 'staff', defaultLabel: 'Staff', icon: 'group' },
  { to: '/timesheets', key: 'timesheets', defaultLabel: 'Timesheets', icon: 'receipt_long' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function ShiftlyLayout(): ReactElement {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { pathname } = useLocation()

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (never highlight every
  // ancestor).
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

  const renderNavLinks = (): ReactElement[] =>
    NAV_KEYS.map((item) => {
      const isActive = item.key === activeKey
      return (
        <Link
          key={item.key}
          to={safeTarget(item.to)}
          data-mol-id={`nav-${item.key}`}
          aria-current={isActive ? 'page' : undefined}
          className={cm.cn(
            'flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium min-h-[44px]',
            isActive
              ? // The container pair, NOT bgPrimarySubtle + textPrimary — brand
                // on a 10% tint of itself fails the 4.5:1 AA floor.
                cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
              : cm.cn('text-on-surface-variant hover:bg-surface-variant', cm.link),
          )}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            {item.icon}
          </span>
          <span>{t(`shiftlyLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}</span>
        </Link>
      )
    })

  const brand = (
    <Link to={safeTarget('/dashboard')} data-mol-id="nav-brand" className={cm.cn('block')}>
      <BrandWordmark as="span" size="md" />
    </Link>
  )

  // One nav element for BOTH mounts — the shell instantiates only the
  // breakpoint's copy, so the links are never in the DOM twice.
  const nav = (
    <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('p', 2))}>
      {renderNavLinks()}
    </div>
  )

  const navAriaLabel = t(
    'shiftlyLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/*
        Mobile top bar (<768px): the shell's 44px menu trigger + brand +
        user menu — the hand-rolled header it replaces, one for one.
        Desktop returns null (mobileOnly): the Sidebar carries the shell.
      */}
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} actions={<UserMenu />} />

      {/*
        Desktop sidebar (>=768px): brand + nav + the UserMenu in the
        bordered footer row — where SidebarLayout kept it.
      */}
      <ResponsiveAppShell.Sidebar navLabel={navAriaLabel} footer={<UserMenu />}>
        {brand}
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the shell's APG dialog over the SAME nav
        element. `h-full` restores the full-height left-panel geometry (the
        shared panel ships no height token).
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        header={brand}
        footer={<UserMenu />}
        className="h-full"
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
