import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { TopNavLayout } from '@molecule/app-top-nav-layout-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'travel_explore' },
  { to: '/trips', key: 'trips', defaultLabel: 'Trips', icon: 'luggage' },
  { to: '/favorites', key: 'favorites', defaultLabel: 'Favorites', icon: 'favorite' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
] as const

const MOBILE_QUERY = '(max-width: 767px)'

/**
 * Shared-module matchMedia listener. TopNavLayout (the shared shell) renders
 * brand + icon nav + user menu in ONE row, which overflows a 390px viewport —
 * below 768px this app renders its own shell instead: a sticky top bar
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
          <NavLink
            to="/"
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-primary shrink-0')}
          >
            <BrandWordmark as="span" size="sm" />
          </NavLink>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
            <ThemeToggle />
            <LanguagePicker display="icon" />
            <UserMenu />
          </div>
        </div>
        {/* Chip nav — scrollable so four destinations always fit a 390px bar */}
        <nav aria-label={navAriaLabel}>
          <div
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('pb', 2),
              cm.flex({ align: 'center', gap: 'sm' }),
              'overflow-x-auto',
            )}
          >
            {navItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                className={({ isActive }) =>
                  cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'min-h-10 shrink-0 items-center rounded-full whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-primary text-on-primary'
                      : cm.cn(cm.textMuted, 'bg-surface-container-low hover:bg-surface-container'),
                  )
                }
              >
                {item.icon ? (
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export function SojournLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`sojournLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const navAriaLabel = t(
    'sojournLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  if (isMobile) {
    return <MobileShell navItems={navItems} navAriaLabel={navAriaLabel} />
  }

  return (
    <TopNavLayout
      appName={APP_NAME}
      logoTo="/"
      navItems={navItems}
      userMenu={
        <>
          <ThemeToggle />
          <LanguagePicker display="icon" />
          <UserMenu />
        </>
      }
      navAriaLabel={navAriaLabel}
    />
  )
}
