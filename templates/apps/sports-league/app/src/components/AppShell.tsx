import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

export const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'sports_score' },
  { to: '/standings', key: 'standings', defaultLabel: 'Standings', icon: 'leaderboard' },
  { to: '/matches', key: 'matches', defaultLabel: 'Matches', icon: 'stadium' },
  { to: '/schedule', key: 'schedule', defaultLabel: 'Schedule', icon: 'event' },
  { to: '/teams', key: 'teams', defaultLabel: 'Teams', icon: 'shield' },
  { to: '/players', key: 'players', defaultLabel: 'Players', icon: 'person' },
  { to: '/stats', key: 'stats', defaultLabel: 'Stats', icon: 'bar_chart' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'badge' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

const MOBILE_QUERY = '(max-width: 767px)'

/**
 * True below 768px. Media-query driven (not CSS-hidden duplicates) so exactly
 * one navigation tree exists in the DOM at any width — keeps `data-mol-id`s
 * and accessible names unique for agents and screen readers.
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

function useNavLabels(): Array<{ to: string; key: string; icon?: string; label: string }> {
  const { t } = useTranslation()
  return NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`pennantLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
}

/**
 * Mobile shell — sticky top bar (brand + hamburger) with a slide-in
 * navigation drawer, shown below 768px where the shared SidebarLayout's
 * fixed 240px aside would eat the viewport. The drawer carries the same
 * nav items (`nav-*` data-mol-ids) plus the user menu, and closes on
 * link click, overlay tap, and Escape.
 */
function MobileShell(): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navItems = useNavLabels()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Escape closes the drawer.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const activeKey =
    NAV_KEYS.reduce<string | null>((best, item) => {
      const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
      if (!isMatch) return best
      if (best === null) return item.key
      const bestItem = NAV_KEYS.find((i) => i.key === best)
      return bestItem && item.to.length > bestItem.to.length ? item.key : best
    }, null) ?? null

  return (
    // NOT cm.pageShell — that is a flex ROW for the sidebar+main pair; the
    // mobile shell is a column (top bar above, scrollable content below).
    <div className={cm.cn('flex h-screen flex-col overflow-hidden bg-background text-on-surface')}>
      <header
        className={cm.cn(
          'sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-outline-variant/40 bg-surface/95 px-4 py-3 backdrop-blur-md',
        )}
      >
        <Link to="/dashboard" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
          <BrandWordmark as="span" size="sm" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-mol-id="mobile-nav-toggle"
          aria-label={t('appShell.openNav', {}, { defaultValue: 'Open navigation' })}
          aria-expanded={open}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-11 w-11 shrink-0 rounded-xl text-on-surface hover:bg-surface-container-low',
          )}
        >
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-2xl')}>
            menu
          </span>
        </button>
      </header>

      <main className={cm.cn(cm.flex1, 'overflow-y-auto')} style={{ minWidth: 0 }}>
        <Outlet />
      </main>

      {/* Overlay + drawer */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={cm.cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <nav
        aria-label={t('pennantLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] overflow-y-auto border-r border-outline-variant/40 bg-surface p-4 shadow-xl transition-transform',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        data-open={open ? 'true' : 'false'}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <BrandWordmark as="span" size="md" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t('appShell.closeNav', {}, { defaultValue: 'Close navigation' })}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-11 w-11 rounded-xl text-on-surface hover:bg-surface-container-low',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-2xl')}>
              close
            </span>
          </button>
        </div>
        <div className={cm.cn(cm.flex1, cm.stack(1))}>
          {navItems.map((item) => {
            const isActive = item.key === activeKey
            return (
              <Link
                key={item.key}
                to={item.to}
                data-mol-id={`nav-${item.key}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setOpen(false)}
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
              >
                {item.icon ? (
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                    {item.icon}
                  </span>
                ) : null}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
        <div className={cm.cn(cm.sp('pt', 4), cm.borderT)}>
          <UserMenu />
        </div>
      </nav>
    </div>
  )
}

/**
 * App chrome for every authed route: the shared SidebarLayout from 768px up,
 * the template-local mobile shell below it.
 */
export function AppShell(): ReactElement {
  const { t } = useTranslation()
  const navItems = useNavLabels()
  const isMobile = useIsMobile()
  if (isMobile) return <MobileShell />
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('pennantLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
