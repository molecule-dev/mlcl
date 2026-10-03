/**
 * Authenticated shell — the shared `ResponsiveAppShell`
 * (`@molecule/app-ui-react`) mounted ONCE as the authed layout route.
 *
 * The shell owns the breakpoint split: the Sidebar mounts only ≥768px, the
 * mobile Drawer (same nav element, full APG dialog contract — focus trap,
 * Escape/backdrop close, scroll lock, auto-close on navigation) only below
 * it, and the TopBar renders the menu trigger itself below the breakpoint.
 * The former template-local `ClarionMobileShell` (its own drawer state,
 * Escape/scroll-lock handlers, `useIsMobile` gate) and the desktop
 * `SidebarLayout` split are deleted with it — one shell, both breakpoints.
 */
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/query', key: 'query', defaultLabel: 'Query', icon: 'query_stats' },
  { to: '/datasets', key: 'datasets', defaultLabel: 'Datasets', icon: 'database' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'bar_chart' },
  { to: '/upload', key: 'upload', defaultLabel: 'Upload', icon: 'upload_file' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/**
 * Nav links shared by the desktop Sidebar and the mobile Drawer — the shell
 * mounts only the breakpoint's copy, so the element is never instantiated
 * twice. Single-active-item resolution is the same longest-prefix rule both
 * former shells used, so both breakpoints agree on the highlighted item.
 * `data-mol-id="nav-<key>"` is preserved (the desktop `SidebarLayout`
 * emitted the same ids).
 */
function ShellNavLinks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const navItems = NAV_KEYS.map((item) => ({
    ...item,
    label: t(`clarionLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  const activeKey = navItems.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null) return item.key
    const bestItem = navItems.find((i) => i.key === best)
    return bestItem && item.to.length > bestItem.to.length ? item.key : best
  }, null)

  return (
    // No <nav> here — the shell's Sidebar/Drawer already wrap children in the
    // nav landmark; a second one would duplicate it in the a11y tree.
    <div className={cm.cn(cm.flex1, cm.sp('p', 3), 'space-y-1 overflow-y-auto list-none m-0')}>
      {navItems.map((item) => {
        const isActive = item.key === activeKey
        return (
          <Link
            key={item.key}
            to={item.to}
            data-mol-id={`nav-${item.key}`}
            aria-current={isActive ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.roundedFull,
              FOCUS_RING,
              isActive
                ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                : cm.cn(cm.textMuted, cm.link),
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

/** Brand lockup for the top bar — the shared BrandWordmark, linked home. */
function TopBarBrand() {
  return (
    <Link to="/dashboard" className="truncate" aria-label={APP_NAME}>
      <BrandWordmark as="span" size="md" />
    </Link>
  )
}

/**
 * The authed layout route element every shell page renders under — see the
 * module doc. `min-w-0` on the UserMenu lets the account card truncate
 * inside the narrow top bar instead of clipping past the viewport edge.
 */
export function ClarionLayout() {
  const { t } = useTranslation()
  // The app's own translated nav-landmark label (carried by the per-locale
  // ui.ts companions) — the shell's English default stays the fallback.
  const navLabel = t('clarionLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })
  const nav = <ShellNavLinks />
  return (
    <ResponsiveAppShell
      sidebarWidth="md"
      // The shell root is a flex ROW on desktop — md:flex-wrap + w-full (on
      // the TopBar below) put the always-mounted bar on its own full-width
      // row above [Sidebar, Content]; without it the header renders as a
      // squeezed column beside the sidebar (the documented RapportLayout
      // pattern). Wrap must be DESKTOP-ONLY: on a wrapping flex-COLUMN
      // (mobile) tall content splits into multiple wrap lines and each line
      // stretches to its own widest item — main measured 762px on a 390px
      // viewport (found by the 390px capture).
      className="md:flex-wrap"
    >
      <ResponsiveAppShell.TopBar
        className="w-full"
        brand={<TopBarBrand />}
        actions={<UserMenu className="min-w-0 max-w-full" />}
      />

      {/* Desktop sidebar (≥768px) — the same nav element the drawer gets. */}
      <ResponsiveAppShell.Sidebar navLabel={navLabel}>{nav}</ResponsiveAppShell.Sidebar>

      {/* Mobile drawer (<768px) — the shell's full APG dialog. `h-full`
          restores the documented full-height left-panel geometry. */}
      <ResponsiveAppShell.Drawer
        className="h-full"
        header={<BrandWordmark as="span" size="lg" />}
        navLabel={navLabel}
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
