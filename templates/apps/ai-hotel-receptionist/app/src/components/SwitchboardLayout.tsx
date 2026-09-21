import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Switchboard shell — the staff workspace chrome around every authed route.
 *
 * Rendered app-locally (not via `@molecule/app-sidebar-layout-react`) because
 * the shared shell is desktop-only: its fixed-width sidebar has no mobile
 * collapse, which left ~240px of a 390px viewport eaten by navigation. Both
 * breakpoints here share one `<Outlet />`:
 *
 * - **md+ (≥768px)** — the original sidebar: brand, vertical nav, bottom
 *   user area (same tokens and `nav-*` ids as the shared shell it replaces).
 * - **<md** — a compact top bar (brand + theme + account) and a horizontally
 *   scrollable chip nav, so the content column keeps the full viewport width.
 *
 * The nav is the staff workflow: dashboard → reservations → rooms & rates →
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
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`switchboardLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  // Single-active-item resolution (same rule as the shared shell): the active
  // nav item is the longest prefix-match of the current pathname, so /calls
  // never lights up both /calls and a shorter prefix.
  const activeKey = navItems.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = navItems.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  // Clicking the link for the route you are already on still produces an
  // observable URL change (#top) instead of being a dead click.
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  const navAriaLabel = t(
    'switchboardLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  const icon = (name: string) => (
    <span className="material-symbols-outlined" aria-hidden="true">
      {name}
    </span>
  )

  return (
    <div className={cm.pageShell}>
      {/* Desktop sidebar (md+) */}
      <aside
        className={cm.cn(
          cm.sp('p', 4),
          cm.shrink0,
          cm.surface,
          cm.borderR,
          'hidden md:flex md:flex-col md:w-60 overflow-y-auto',
        )}
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

        <nav className={cm.cn(cm.flex1, cm.stack(1))} aria-label={navAriaLabel}>
          {navItems.map((item) => {
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
                {item.icon ? icon(item.icon) : null}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div
          className={cm.cn(cm.sp('pt', 4), cm.flex({ direction: 'col', gap: 'sm' }), cm.borderT)}
        >
          <UserMenu />
          <div className={cm.cn(cm.flex({ justify: 'end' }))}>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Content column — mobile chrome on top, full width for the page */}
      <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), 'min-w-0')}>
        {/* Mobile top bar (<md) */}
        <header
          className={cm.cn(
            'md:hidden',
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.surface,
            cm.borderB,
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          )}
        >
          <Link
            to={safeTarget('/dashboard')}
            data-mol-id="mobile-brand"
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
          >
            {APP_NAME}
          </Link>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        {/* Mobile nav — horizontally scrollable chips (<md) */}
        <nav
          aria-label={navAriaLabel}
          className={cm.cn(
            'md:hidden',
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.surface,
            cm.borderB,
            cm.flex({ direction: 'row', gap: 'xs' }),
            'overflow-x-auto',
          )}
        >
          {navItems.map((item) => {
            const isActive = item.key === activeKey
            return (
              <Link
                key={item.key}
                to={safeTarget(item.to)}
                data-mol-id={`mnav-${item.key}`}
                aria-current={isActive ? 'page' : undefined}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'shrink-0 whitespace-nowrap rounded-full min-h-[40px]',
                  isActive
                    ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                    : cm.cn(cm.textMuted, 'border border-outline-variant'),
                )}
              >
                {item.icon ? icon(item.icon) : null}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <main className={cm.cn(cm.pageShellContent, 'min-w-0')}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
