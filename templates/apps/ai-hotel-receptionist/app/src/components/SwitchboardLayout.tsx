import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
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

  // Brand lockup — the ONE shared brand component (concierge tile + serif
  // wordmark). Used by the mobile top bar and the drawer header; the desktop
  // sidebar carries the same mark below (only one mounts per breakpoint, so
  // the brand never duplicates in the DOM — same rule as the nav items).
  const brand = (
    <Link to={safeTarget('/dashboard')} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
      <BrandWordmark as="span" size="md" />
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
          /* Sidebar bottom bar — styled to match the sidebar's editorial
             ivory/ink design. Without this, UserMenu + ThemeToggle render
             as bare browser controls bolted onto a styled sidebar. */
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              'w-full border-t border-outline-variant/40 pt-3',
            )}
          >
            <div className="text-on-surface-variant hover:text-on-surface transition-colors">
              <UserMenu />
            </div>
            <div className="text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container">
              <ThemeToggle />
            </div>
          </div>
        }
      >
        <Link
          to={safeTarget('/dashboard')}
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 6))}
        >
          <BrandWordmark as="span" size="md" />
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
