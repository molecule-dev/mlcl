import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'pets' },
  { to: '/pets', key: 'pets', defaultLabel: 'Pets', icon: 'cruelty_free' },
  { to: '/sitters', key: 'sitters', defaultLabel: 'Sitters', icon: 'volunteer_activism' },
  { to: '/bookings', key: 'bookings', defaultLabel: 'Bookings', icon: 'event_available' },
  {
    to: '/vet-records',
    key: 'vetRecords',
    defaultLabel: 'Vet Records',
    icon: 'medical_information',
  },
  { to: '/medications', key: 'medications', defaultLabel: 'Medications', icon: 'medication' },
  { to: '/messages', key: 'messages', defaultLabel: 'Messages', icon: 'chat' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

const MOBILE_QUERY = '(max-width: 767px)'

/**
 * Shared-module matchMedia listener. The shared SidebarLayout renders a
 * fixed-width sidebar with no mobile collapse, which crowds a 390px viewport
 * — below 768px this app renders its own shell instead: a sticky top bar
 * (brand + controls) with the nav as a horizontally scrollable chip row
 * underneath, per the fleet mobile pattern.
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

function MobileShell({
  navItems,
  navAriaLabel,
}: {
  navItems: Array<{ to: string; key: string; icon?: string; label: string }>
  navAriaLabel: string
}): JSX.Element {
  const cm = getClassMap()
  const { pathname } = useLocation()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <header className={cm.cn('sticky top-0 z-40 bg-surface shadow-sm')}>
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          )}
        >
          <Link
            to="/dashboard"
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-primary shrink-0')}
          >
            {APP_NAME}
          </Link>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
            <UserMenu />
          </div>
        </div>
        {/* Chip nav — scrollable so every destination stays reachable on a 390px bar */}
        <nav aria-label={navAriaLabel}>
          <div
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('pb', 2),
              cm.flex({ align: 'center', gap: 'sm' }),
              'overflow-x-auto',
            )}
          >
            {navItems.map((item) => {
              const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`)
              return (
                <NavLink
                  key={item.key}
                  to={item.to}
                  data-mol-id={`nav-${item.key}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'min-h-10 shrink-0 items-center rounded-full whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-primary text-on-primary'
                      : cm.cn(cm.textMuted, 'bg-surface-container-low hover:bg-surface-container'),
                  )}
                >
                  {item.icon ? (
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">
                      {item.icon}
                    </span>
                  ) : null}
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export function NuzzleLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`nuzzleLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const navAriaLabel = t('nuzzleLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  if (isMobile) {
    return <MobileShell navItems={navItems} navAriaLabel={navAriaLabel} />
  }

  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={navAriaLabel}
      sidebarWidthClass="w-64"
    />
  )
}
