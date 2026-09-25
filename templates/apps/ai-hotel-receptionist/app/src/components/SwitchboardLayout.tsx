import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Switchboard shell — the staff workspace chrome around every authed route,
 * composed from the shared `ResponsiveAppShell` family: a mobile-only top
 * bar (brand + theme + account; the desktop brand row lives in the sidebar),
 * a ≥md sidebar, and a <md dialog drawer carrying the SAME nav element (only
 * the mounted breakpoint instantiates it, so nav `data-mol-id`s never
 * duplicate in the DOM). The shell owns the breakpoint, the drawer open
 * state, the menu trigger, focus/Escape/backdrop handling, and the
 * auto-close-on-navigation; this component only supplies nav + brand. The
 * nav is the staff workflow: dashboard → reservations → rooms & rates →
 * guests → the voice side (agents, calls, simulator).
 */
const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  {
    to: '/reservations',
    key: 'reservations',
    defaultLabel: 'Reservations',
    icon: 'event_available',
  },
  { to: '/rooms', key: 'rooms', defaultLabel: 'Rooms & Rates', icon: 'meeting_room' },
  { to: '/guests', key: 'guests', defaultLabel: 'Guests', icon: 'badge' },
  { to: '/voice-agents', key: 'voiceAgents', defaultLabel: 'Voice Agents', icon: 'graphic_eq' },
  { to: '/calls', key: 'calls', defaultLabel: 'Calls', icon: 'call' },
  { to: '/simulator', key: 'simulator', defaultLabel: 'Call Simulator', icon: 'support_agent' },
] as const

export function SwitchboardLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const navAriaLabel = t(
    'switchboardLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  // Single-active-item resolution (same rule as the shared shell): the active
  // nav item is the longest prefix-match of the current pathname, so /calls
  // never lights up both /calls and a shorter prefix.
  const activeKey = NAV_KEYS.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = NAV_KEYS.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  // Clicking the link for the route you are already on still produces an
  // observable URL change (#top) instead of being a dead click.
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same array, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close.
  const navItems = NAV_KEYS.map((item) => {
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
          cm.roundedFull,
          isActive
            ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
            : cm.cn(cm.textMuted, cm.link),
        )}
      >
        {item.icon ? (
          <span className="material-symbols-outlined" aria-hidden="true">
            {item.icon}
          </span>
        ) : null}
        <span>
          {t(`switchboardLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
        </span>
      </Link>
    )
  })

  const brand = (
    <Link to={safeTarget('/dashboard')} className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
      {APP_NAME}
    </Link>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/* Mobile top bar (<md) — the shell renders the menu trigger itself. */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={brand}
        actions={
          <>
            <ThemeToggle />
            <UserMenu />
          </>
        }
      />

      {/*
        Desktop sidebar (≥md). The brand row leads the nav column — the
        shared Sidebar has no header slot, so it rides inside `children`.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        className={cm.sp('p', 4)}
        footer={
          <>
            <UserMenu />
            <div className={cm.flex({ justify: 'end' })}>
              <ThemeToggle />
            </div>
          </>
        }
      >
        <Link
          to={safeTarget('/dashboard')}
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            cm.displayBlock,
          )}
        >
          {APP_NAME}
        </Link>
        {navItems}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<md): the full APG dialog contract (focus trap,
        Escape, backdrop click, body-scroll lock) over the same nav, with the
        brand in the header row next to the shell's close button.
      */}
      <ResponsiveAppShell.Drawer navLabel={navAriaLabel} header={brand} className="h-full">
        {navItems}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
