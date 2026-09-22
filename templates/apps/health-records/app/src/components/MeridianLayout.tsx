import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'monitor_heart' },
  { to: '/records', key: 'records', defaultLabel: 'Records', icon: 'folder_shared' },
  { to: '/medications', key: 'medications', defaultLabel: 'Medications', icon: 'medication' },
  { to: '/labs', key: 'labs', defaultLabel: 'Lab Results', icon: 'science' },
  { to: '/immunizations', key: 'immunizations', defaultLabel: 'Immunizations', icon: 'vaccines' },
  { to: '/visits', key: 'visits', defaultLabel: 'Visits', icon: 'event_available' },
  { to: '/documents', key: 'documents', defaultLabel: 'Documents', icon: 'description' },
  { to: '/sharing', key: 'sharing', defaultLabel: 'Sharing', icon: 'shield_person' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'account_circle' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Template-local shell. Desktop (≥768px) renders the shared SidebarLayout
 * unchanged; below 768px — where a fixed 240px sidebar would eat most of a
 * 390px phone — a template-local mobile shell takes over: sticky top bar
 * (brand + hamburger) and a slide-in drawer carrying the same nav items and
 * user menu, with an overlay, Escape-to-close, and close-on-navigate.
 */
export function MeridianLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent): void => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Close the drawer whenever the route changes (nav link click, back button).
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`meridianLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  if (!mounted) {
    // One silent frame while matchMedia resolves — prevents a desktop-sidebar
    // flash on phones (and the reverse) without shifting any page content.
    return <div className={cm.cn(cm.minH('screen'))} data-mol-id="meridian-shell" />
  }

  if (!isMobile) {
    return (
      <SidebarLayout
        appName={APP_NAME}
        logoTo="/dashboard"
        navItems={navItems}
        userMenu={<UserMenu />}
        navAriaLabel={t(
          'meridianLayout.primaryNavLabel',
          {},
          {
            defaultValue: 'Primary navigation',
          },
        )}
        sidebarWidthClass="w-64"
      />
    )
  }

  const navAriaLabel = t(
    'meridianLayout.primaryNavLabel',
    {},
    {
      defaultValue: 'Primary navigation',
    },
  )

  return (
    <div
      className={cm.cn(cm.minH('screen'), cm.flex({ direction: 'col' }))}
      data-mol-id="meridian-shell"
    >
      {/* Sticky top bar */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.surface,
          cm.borderB,
        )}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          minHeight: '56px',
        }}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.flex1, 'min-w-0')}>
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label={t('meridianLayout.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={drawerOpen}
            aria-controls="meridian-drawer-nav"
            data-mol-id="nav-toggle"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              cm.shrink0,
            )}
            style={{ width: '44px', height: '44px', color: 'var(--color-on-surface)' }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {drawerOpen ? 'close' : 'menu'}
            </span>
          </button>
          <Link
            to="/dashboard"
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'truncate')}
          >
            {APP_NAME}
          </Link>
        </div>
        <div className={cm.cn(cm.shrink0)} style={{ minHeight: '44px' }}>
          <UserMenu />
        </div>
      </header>

      {/* Overlay */}
      {drawerOpen && (
        <div
          role="presentation"
          onClick={() => setDrawerOpen(false)}
          data-mol-id="nav-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 50,
          }}
        />
      )}

      {/* Slide-in drawer */}
      <aside
        id="meridian-drawer-nav"
        className={cm.cn(cm.sp('p', 4), cm.flex({ direction: 'col' }), cm.surface, cm.borderR)}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: drawerOpen ? 0 : '-280px',
          width: '272px',
          maxWidth: '85vw',
          zIndex: 60,
          transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowY: 'auto',
          visibility: drawerOpen ? 'visible' : 'hidden',
        }}
        aria-label={navAriaLabel}
      >
        <Link
          to="/dashboard"
          className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), 'block')}
        >
          {APP_NAME}
        </Link>
        <nav
          id="meridian-drawer-nav-list"
          className={cm.cn(cm.flex1, cm.stack(1))}
          aria-label={navAriaLabel}
        >
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
            return (
              <Link
                key={item.key}
                to={item.to}
                data-mol-id={`nav-${item.key}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setDrawerOpen(false)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  cm.roundedFull,
                  isActive
                    ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                    : cm.cn(cm.textMuted, cm.link),
                )}
                style={{ minHeight: '44px' }}
              >
                {item.icon ? (
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className={cm.cn(cm.sp('pt', 4), cm.borderT)}>
          <UserMenu />
        </div>
      </aside>

      <main className={cm.cn(cm.flex1, 'min-w-0')} style={{ minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  )
}
