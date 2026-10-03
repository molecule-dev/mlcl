/**
 * ParlanceLayout — shell for all authed routes, built on the SHARED
 * `ResponsiveAppShell` compound from `@molecule/app-ui-react`.
 *
 * The shell owns the breakpoint split (768px, one chrome mounted per
 * breakpoint): the desktop Sidebar (where `SidebarLayout` used to carry the
 * Wayfarer nav set) + the mobile Drawer (full APG dialog — focus trap,
 * Escape/backdrop close, scroll lock, auto-close on navigation) render the
 * SAME nav element, and the mobile-only TopBar renders the 44px menu trigger
 * itself. The former template-local hamburger/drawer state machine is deleted
 * with it.
 *
 * Nav targets/labels (i18n), longest-prefix active highlighting,
 * `aria-current="page"`, the `nav-*` data-mol-ids and the UserMenu placement
 * (sidebar footer on desktop, opening leftward adjacent to its trigger; top
 * bar + drawer footer on mobile) are preserved from the previous shells.
 * Brand link points back to `/talk` so the active surface is always one tap
 * away.
 */
import type { ReactElement } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/talk', key: 'talk', defaultLabel: 'Talk', icon: 'graphic_eq' },
  { to: '/trips', key: 'trips', defaultLabel: 'Trips', icon: 'flight_takeoff' },
  { to: '/bills', key: 'bills', defaultLabel: 'Bills', icon: 'call_split' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
  { to: '/settings/billing', key: 'billing', defaultLabel: 'Billing', icon: 'credit_card' },
] as const

export function ParlanceLayout(): ReactElement {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { pathname } = useLocation()

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (never highlight every
  // ancestor) — /settings/billing is active while on it, /settings is not.
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
          <span>
            {t(`parlanceLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
          </span>
        </Link>
      )
    })

  const brand = (
    <Link to={safeTarget('/talk')} data-mol-id="nav-brand" className={cm.cn('block')}>
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
    'parlanceLayout.primaryNavLabel',
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
        bordered footer row, opening LEFT — the trigger sits at the
        sidebar's bottom-LEFT, so the panel opens adjacent to it, not
        across the screen.
      */}
      <ResponsiveAppShell.Sidebar navLabel={navAriaLabel} footer={<UserMenu side="left" />}>
        {brand}
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the shell's APG dialog over the SAME nav
        element, footer UserMenu opening leftward inside the left-anchored
        panel. `h-full` restores the full-height left-panel geometry (the
        shared panel ships no height token).
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        header={brand}
        footer={<UserMenu side="left" />}
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
