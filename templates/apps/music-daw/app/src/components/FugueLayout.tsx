import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { TransportBar } from './TransportBar.js'
import { useMediaQuery } from './useMediaQuery.js'
import { UserMenu } from './UserMenu.js'

/**
 * Vertical-sidebar studio shell. Reserves space at the bottom for the
 * sticky <TransportBar /> (DAW play/stop/record + BPM + timecode) so
 * page content never disappears under the transport.
 *
 * The shared <SidebarLayout /> has no mobile collapse (its aside is a
 * fixed 240px column), so below the `md` breakpoint this shell renders
 * a template-local top bar (hamburger → slide-down nav drawer) instead.
 * Only ONE shell mounts at a time (useMediaQuery), so pages never
 * double-fetch and nav `data-mol-id`s stay unique per viewport.
 *
 * Translated from music-streaming's ReverbLayout.tsx (sidebar +
 * NowPlayingBar dock pattern), with DAW-specific nav (Studio, Projects,
 * Samples, Mixer) and the transport-bar slot.
 */

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Studio', icon: 'home' },
  { to: '/projects', key: 'projects', defaultLabel: 'Projects', icon: 'folder' },
  { to: '/samples', key: 'samples', defaultLabel: 'Samples', icon: 'library_music' },
  { to: '/profile/me', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function FugueLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close the drawer whenever the route changes (nav tap) or Escape.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])
  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`fugueLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  if (isMobile) {
    return (
      <div style={{ paddingTop: '56px', paddingBottom: '72px' }} data-mol-id="fugue-mobile-shell">
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('px', 4),
            'fixed top-0 left-0 right-0 z-40 border-b border-outline-variant',
          )}
          style={{
            backgroundColor: 'var(--color-background-secondary)',
            height: '56px',
          }}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen((o) => !o)}
            aria-expanded={drawerOpen}
            aria-controls="fugue-mobile-nav"
            aria-label={t('fugueLayout.toggleMenu', {}, { defaultValue: 'Toggle menu' })}
            data-mol-id="nav-menu-toggle"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-11 w-11 -ml-2 rounded-full text-on-surface-variant hover:text-on-surface transition-colors',
            )}
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
          <UserMenu />
        </header>

        {drawerOpen && (
          <nav
            id="fugue-mobile-nav"
            aria-label={t(
              'fugueLayout.primaryNavLabel',
              {},
              { defaultValue: 'Primary navigation' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.stack(1),
              'fixed top-14 left-0 right-0 z-40 border-b border-outline-variant shadow-lg',
            )}
            style={{ backgroundColor: 'var(--color-background-secondary)' }}
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
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    'min-h-[44px] rounded-xl text-sm font-medium transition-colors',
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
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        )}

        <Outlet />
        <TransportBar />
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: '72px' }}>
      <SidebarLayout
        appName={APP_NAME}
        logoTo="/dashboard"
        navItems={navItems}
        userMenu={<UserMenu />}
        navAriaLabel={t('fugueLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
      />
      <TransportBar />
    </div>
  )
}
