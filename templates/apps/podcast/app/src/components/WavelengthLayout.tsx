import { useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { NowPlayingBar } from './NowPlayingBar.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/discover', key: 'discover', defaultLabel: 'Discover', icon: 'explore' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/library', key: 'library', defaultLabel: 'Library', icon: 'library_music' },
  { to: '/queue', key: 'queue', defaultLabel: 'Queue', icon: 'queue_music' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * App shell: the shared `SidebarLayout` at ≥768px, a template-local mobile
 * shell below that (sticky top bar + horizontally scrollable chip nav).
 * The shared sidebar has no mobile collapse of its own, so at <768px the
 * `.wvl-*` rules in index.css hide its `<aside>` and relax it to document
 * flow — the chip nav below replaces it. Active-chip state mirrors the
 * sidebar's longest-prefix match.
 */
export function WavelengthLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`wavelengthLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  // Single-active-item resolution: longest prefix-match wins (same rule the
  // shared SidebarLayout applies to its vertical list).
  const activeKey = navItems.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null) return item.key
    const current = navItems.find((i) => i.key === best)
    return current && item.to.length > current.to.length ? item.key : best
  }, null)

  // Keep the active chip visible when the nav row overflows horizontally.
  useEffect(() => {
    if (!activeKey) return
    document
      .querySelector(`[data-mol-id="mobile-nav-${activeKey}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [activeKey])

  return (
    <div style={{ paddingBottom: '88px' }}>
      {/* Mobile chrome (hidden ≥768px where the sidebar takes over). */}
      <div className="md:hidden sticky top-0 z-30">
        <header
          className={
            'flex items-center justify-between gap-2 border-b border-outline-variant bg-surface px-3 py-2'
          }
        >
          <Link
            to="/discover"
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight truncate')}
          >
            {APP_NAME}
          </Link>
          <div className="shrink-0">
            <UserMenu dataMolId="mobile-user-card" compact />
          </div>
        </header>
        <nav
          aria-label={t(
            'wavelengthLayout.primaryNavLabel',
            {},
            { defaultValue: 'Primary navigation' },
          )}
          className={
            'flex items-center gap-2 overflow-x-auto border-b border-outline-variant bg-surface px-3 py-2'
          }
        >
          {navItems.map((item) => {
            const isActive = item.key === activeKey
            return (
              <NavLink
                key={item.key}
                to={item.to}
                data-mol-id={`mobile-nav-${item.key}`}
                aria-current={isActive ? 'page' : undefined}
                className={
                  'flex shrink-0 items-center gap-1 rounded-full border px-3 py-2 text-sm font-medium whitespace-nowrap' +
                  (isActive
                    ? ' border-transparent bg-primary text-on-primary'
                    : ' border-outline-variant bg-surface text-on-surface-variant')
                }
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>

      <SidebarLayout
        className="wvl-shell"
        appName={APP_NAME}
        logoTo="/discover"
        navItems={navItems}
        userMenu={<UserMenu />}
        navAriaLabel={t(
          'wavelengthLayout.primaryNavLabel',
          {},
          { defaultValue: 'Primary navigation' },
        )}
      />
      <NowPlayingBar />
    </div>
  )
}
