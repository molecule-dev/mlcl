/**
 * Auth'd app shell — the shared `ResponsiveAppShell` compound from
 * `@molecule/app-ui-react` (fleet standard; replaces the former
 * template-local sticky top bar + horizontally-scrollable mobile chip nav).
 *
 *   ≥ 768px: sticky TopBar — brand + labeled inline nav + user menu. The
 *            inline nav is MOUNT-CONDITIONED via the shell's own
 *            `useIsDesktop` (not CSS-hidden), so only one nav is ever in
 *            the DOM per breakpoint.
 *   < 768px: the TopBar renders the shell's 44px menu trigger and the nav
 *            moves into the Drawer — the full APG dialog contract (focus
 *            trap, Escape/backdrop close, body scroll lock, auto-close on
 *            navigation). Every item keeps its icon AND label, so nothing
 *            is icon-only on touch (the QA rule that built the chip nav).
 *
 * The nav element array is shared between the desktop nav and the Drawer,
 * but only ONE instantiates at a time (the desktop nav unmounts below the
 * breakpoint; the Drawer's children mount only while it is open), so nav
 * landmarks never duplicate. Active marking stays on the links themselves
 * (`NavLink` sets `aria-current="page"`).
 */

import { NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell, useIsDesktop } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'travel_explore' },
  { to: '/trips', key: 'trips', defaultLabel: 'Trips', icon: 'luggage' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'notifications_active' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function FlightSearchLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const navAriaLabel = t(
    'flightSearchLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  // ONE description of the nav, instantiated by whichever breakpoint's
  // surface mounts (the desktop inline nav OR the open mobile drawer).
  const navItems = NAV_KEYS.map((item) => (
    <NavLink
      key={item.key}
      to={item.to}
      className={({ isActive }) =>
        cm.cn(
          'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
          isActive
            ? 'bg-primary text-on-primary shadow-sm'
            : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
        )
      }
    >
      <span className="material-symbols-outlined text-base" aria-hidden="true">
        {item.icon}
      </span>
      <span>
        {t(`flightSearchLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
      </span>
    </NavLink>
  ))

  return (
    <ResponsiveAppShell>
      <ResponsiveAppShell.TopBar
        brand={
          // The shell wraps `brand` in a plain div, so the brand link and the
          // inline nav need their own flex row to sit side by side.
          <div className="flex min-w-0 items-center gap-3">
            <NavLink to="/" className={cm.cn('shrink-0')}>
              <BrandWordmark as="span" />
            </NavLink>
            {isDesktop ? (
              // Desktop inline nav (≥768px, mount-conditioned). The shell's
              // TopBar has no nav slot, so it rides beside the brand — the
              // documented top-nav-on-desktop composition.
              <nav
                className="flex items-center gap-1"
                aria-label={navAriaLabel}
                data-mol-id="primary-nav"
              >
                {navItems}
              </nav>
            ) : null}
          </div>
        }
        actions={
          // Styled cell so the menu doesn't render as a bare browser control
          // in the styled header row (fleet chrome pattern).
          <div className="flex min-w-0 shrink-0 items-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface">
            <UserMenu />
          </div>
        }
      />

      {/* Mobile nav drawer (<768px) — the shell renders the menu trigger in
          the TopBar, owns open/close + focus/Escape/backdrop + auto-close on
          navigation, and wraps the items in its own <nav> landmark. */}
      <ResponsiveAppShell.Drawer navLabel={navAriaLabel} className="h-full">
        {navItems}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
