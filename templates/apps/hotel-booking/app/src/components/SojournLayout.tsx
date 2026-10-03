/**
 * Sojourn layout wrapper — the SHARED `ResponsiveAppShell` compound from
 * `@molecule/app-ui-react`, consumed by every authed route
 * (Search/Trips/Favorites/Notifications/Account).
 *
 * The shell owns the breakpoint split (768px, one chrome mounted per
 * breakpoint): the desktop Sidebar + the mobile Drawer (full APG dialog —
 * focus trap, Escape/backdrop close, scroll lock, auto-close on navigation)
 * render the SAME nav element, and the mobile-only TopBar renders the 44px
 * menu trigger itself. The former pair — the shared `TopNavLayout` (whose
 * brand + 4 icon links + UserMenu overflowed a 390px header, measured
 * scrollWidth 426 vs 390) and the template-local chip `MobileShell` — are
 * deleted with it.
 *
 * Nav targets/labels (i18n), longest-prefix active highlighting,
 * `aria-current="page"`, the `nav-*` data-mol-ids, the theme/language/user
 * controls and the `Search`-first nav rhythm are preserved from the previous
 * shells.
 */
import type { ReactElement } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'travel_explore' },
  { to: '/trips', key: 'trips', defaultLabel: 'Trips', icon: 'luggage' },
  { to: '/favorites', key: 'favorites', defaultLabel: 'Favorites', icon: 'favorite' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
] as const

export function SojournLayout(): ReactElement {
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
          <span>{t(`sojournLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}</span>
        </Link>
      )
    })

  const brand = (
    <Link to={safeTarget('/search')} data-mol-id="nav-brand" className={cm.cn('block')}>
      <BrandWordmark as="span" size="md" />
    </Link>
  )

  // The chrome both breakpoints carried before: theme, language, user menu.
  const controls = (
    <>
      <ThemeToggle />
      <LanguagePicker display="icon" />
      <UserMenu />
    </>
  )

  // One nav element for BOTH mounts — the shell instantiates only the
  // breakpoint's copy, so the links are never in the DOM twice.
  const nav = (
    <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('p', 2))}>
      {renderNavLinks()}
    </div>
  )

  const navAriaLabel = t(
    'sojournLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/*
        Mobile top bar (<768px): the shell's 44px menu trigger + brand +
        theme/language/user controls. Desktop returns null (mobileOnly):
        the Sidebar carries the shell.
      */}
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} actions={controls} />

      {/*
        Desktop sidebar (>=768px): brand + nav + the controls in the
        bordered footer row.
      */}
      <ResponsiveAppShell.Sidebar navLabel={navAriaLabel} footer={controls}>
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
        footer={controls}
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
