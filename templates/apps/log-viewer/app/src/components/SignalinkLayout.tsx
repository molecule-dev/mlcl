import { Link, NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated shell — the shared `ResponsiveAppShell`: brand top bar
 * (mobile menu trigger included), desktop sidebar (≥768px), dialog drawer
 * (<768px — focus trap, Escape/backdrop close, auto-close on navigation) and
 * one content column. Terminal aesthetic per DESIGN.md: background-secondary
 * aside, cyan active accent, monospace labels. Page padding stays inside the
 * pages; `.Content` is a bare `<main>`.
 */

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'space_dashboard' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/traces', key: 'traces', defaultLabel: 'Traces', icon: 'timeline' },
  { to: '/streams', key: 'streams', defaultLabel: 'Streams', icon: 'stream' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'notifications_active' },
  { to: '/incidents', key: 'incidents', defaultLabel: 'Incidents', icon: 'whatshot' },
  { to: '/services', key: 'services', defaultLabel: 'Services', icon: 'hub' },
  { to: '/saved', key: 'saved', defaultLabel: 'Saved', icon: 'bookmark' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function SignalinkLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`signalinkLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  const navLabel = t('signalinkLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  // The SAME element both breakpoints receive — the shell mounts only the
  // breakpoint's copy, so the `sidebar-nav-*` ids are never duplicated.
  // NavLink sets `aria-current="page"` on the active link itself.
  const nav = (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}
      style={{ padding: '18px 12px' }}
    >
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          data-mol-id={`sidebar-nav-${item.to.slice(1)}`}
          className={cm.cn('flex items-center gap-3 no-underline rounded-lg')}
          style={({ isActive }) => ({
            padding: '9px 12px',
            fontSize: '13px',
            fontWeight: isActive ? 700 : 500,
            color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: isActive
              ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
              : 'transparent',
            borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
          })}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: '20px' }}
            aria-hidden="true"
          >
            {item.icon}
          </span>
          <span style={{ fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.02em' }}>
            {item.label}
          </span>
        </NavLink>
      ))}
    </div>
  )

  const brand = (
    <Link to="/dashboard" className={cm.cn('inline-flex items-center gap-2 no-underline')}>
      <BrandWordmark as="span" />
    </Link>
  )

  // Desktop-only tagline — lives in the Sidebar (which mounts ≥768px only),
  // so no responsive hiding is needed.
  const tagline = (
    <span
      style={{
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '10px',
        fontWeight: 800,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--color-text-secondary)',
      }}
    >
      {t('signalinkLayout.tagline', {}, { defaultValue: '$ signalink --live' })}
    </span>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md" dataMolId="signalink-shell">
      <ResponsiveAppShell.TopBar
        mobileOnly
        dataMolId="signalink-topbar"
        brand={brand}
        actions={
          <>
            <ThemeToggle />
            <UserMenu />
          </>
        }
      />
      {/* Desktop keeps brand + user affordances in the Sidebar: brand + the
          terminal tagline above the nav; theme toggle beside the UserMenu in
          the identity footer. Wrapped in a bordered row so the controls do
          not render as bare widgets bolted onto the styled rail (terminal
          aesthetic: secondary text + hover tint). */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        footer={
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              'w-full border-t border-outline-variant/40 pt-3',
            )}
          >
            <div className="text-on-surface-variant hover:text-on-surface transition-colors">
              <UserMenu side="left" />
            </div>
            <div className="text-on-surface-variant hover:text-on-surface transition-colors">
              <ThemeToggle />
            </div>
          </div>
        }
      >
        <div className={cm.cn('inline-flex items-center gap-2', cm.sp('px', 3), cm.sp('py', 3))}>
          {brand}
          {tagline}
        </div>
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        header={brand}
        footer={
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              'w-full border-t border-outline-variant/40 pt-3',
            )}
          >
            <div className="text-on-surface-variant hover:text-on-surface transition-colors">
              <UserMenu side="left" />
            </div>
          </div>
        }
      >
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content dataMolId="signalink-main" style={{ overflowX: 'hidden' }}>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
