import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { useIsMobile } from './useIsMobile.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated shell — vertical sidebar nav covering every screen in
 * `screen-map.json`, brand wordmark, user menu. Template-local because the
 * shared @molecule/app-sidebar-layout-react has no mobile collapse: below
 * 768px the sidebar becomes a slide-in drawer (hamburger in a sticky top
 * bar, dimmed overlay, Escape + route-change close) — the fleet mobile-shell
 * pattern (expense-report / invoice-billing RemitLayout).
 *
 * Terminal aesthetic per DESIGN.md: background-secondary aside, cyan active
 * accent, monospace labels.
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
  const location = useLocation()
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`signalinkLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  // Any route change closes the mobile drawer.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  const closeDrawer = (): void => setDrawerOpen(false)

  return (
    <div
      data-mol-id="signalink-shell"
      className={cm.cn(cm.flex({ direction: 'row' }), 'min-h-screen')}
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* Mobile drawer overlay */}
      {isMobile && drawerOpen ? (
        <div
          role="presentation"
          data-mol-id="signalink-drawer-overlay"
          onClick={closeDrawer}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.55)',
            zIndex: 40,
          }}
        />
      ) : null}

      <aside
        data-mol-id="signalink-sidebar"
        aria-label={t(
          'signalinkLayout.primaryNavLabel',
          {},
          { defaultValue: 'Primary navigation' },
        )}
        className={cm.cn(cm.flex({ direction: 'col' }))}
        style={{
          width: '240px',
          flexShrink: 0,
          backgroundColor: 'var(--color-background-secondary)',
          borderRight: '1px solid var(--color-border)',
          padding: '18px 12px',
          ...(isMobile
            ? {
                position: 'fixed',
                top: 0,
                bottom: 0,
                left: drawerOpen ? 0 : '-260px',
                height: '100vh',
                overflowY: 'auto',
                zIndex: 50,
                transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: drawerOpen ? '8px 0 24px rgba(3, 7, 18, 0.45)' : 'none',
              }
            : {
                position: 'fixed',
                top: 0,
                left: 0,
                height: '100vh',
                zIndex: 50,
              }),
        }}
      >
        <div style={{ padding: '2px 10px 20px 10px' }}>
          <Link
            to="/dashboard"
            onClick={closeDrawer}
            className={cm.cn('inline-flex items-center gap-2 no-underline')}
          >
            <span
              className={cm.cn('flex items-center justify-center')}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-surface-dim)',
                fontSize: '15px',
                fontWeight: 800,
              }}
              aria-hidden="true"
            >
              $
            </span>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '-0.01em',
                color: 'var(--color-on-surface)',
              }}
            >
              {APP_NAME}
            </span>
          </Link>
        </div>

        <nav
          aria-label={t(
            'signalinkLayout.primaryNavLabel',
            {},
            { defaultValue: 'Primary navigation' },
          )}
          className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.flex1)}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeDrawer}
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
        </nav>

        {/* User menu slot at the drawer bottom */}
        <div
          style={{
            marginTop: '12px',
            padding: '12px 10px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <UserMenu />
        </div>
      </aside>

      <div
        className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1)}
        style={{ minWidth: 0, marginLeft: isMobile ? 0 : '240px' }}
      >
        {/* Sticky top bar — hamburger on mobile only */}
        <header
          data-mol-id="signalink-topbar"
          className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
          style={{
            height: '56px',
            padding: isMobile ? '0 12px' : '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backgroundColor: 'color-mix(in srgb, var(--color-background) 88%, transparent)',
            borderBottom: '1px solid var(--color-border)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {isMobile ? (
            <button
              type="button"
              data-mol-id="signalink-menu-toggle"
              aria-label={t(
                'signalinkLayout.openMenu',
                {},
                { defaultValue: 'Open navigation menu' },
              )}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'border-0 bg-transparent cursor-pointer',
              )}
              style={{
                width: '40px',
                height: '40px',
                marginLeft: '-8px',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span
                className={cm.cn('material-symbols-outlined')}
                style={{ fontSize: '24px' }}
                aria-hidden="true"
              >
                menu
              </span>
            </button>
          ) : (
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
          )}
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))} style={{ flexShrink: 0 }}>
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main data-mol-id="signalink-main" className={cm.flex1} style={{ overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
