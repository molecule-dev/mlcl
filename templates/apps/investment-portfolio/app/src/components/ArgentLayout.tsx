import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/holdings', key: 'holdings', defaultLabel: 'Holdings', icon: 'pie_chart' },
  { to: '/watchlist', key: 'watchlist', defaultLabel: 'Watchlist', icon: 'visibility' },
  { to: '/transactions', key: 'transactions', defaultLabel: 'Transactions', icon: 'receipt_long' },
  { to: '/rebalance', key: 'rebalance', defaultLabel: 'Rebalance', icon: 'balance' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'bar_chart' },
  { to: '/news', key: 'news', defaultLabel: 'News', icon: 'article' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/** Below 768px the shared SidebarLayout keeps its 230px rail, crushing the
 *  content column at 390px (hero cards clipped, headings truncated), so
 *  narrower screens get the template-local mobile shell instead: a sticky
 *  top bar (brand + user menu) with a horizontally scrollable chip nav row
 *  under it. Rendered via matchMedia — only one shell is ever mounted, so
 *  the routed page never mounts twice. */
const DESKTOP_QUERY = '(min-width: 768px)'

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const onChange = (e: MediaQueryListEvent): void => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

function useNavItems(): Array<{ to: string; key: string; icon: string; label: string }> {
  const { t } = useTranslation()
  return NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`argentLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
}

/**
 * Mobile shell (< 768px): sticky brand bar + scrollable chip nav. The chip
 * row is width-constrained and scrolls within itself, so the page never
 * overflows horizontally at 390px.
 */
function MobileShell() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navItems = useNavItems()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <header
        className={cm.cn('sticky top-0 z-40 bg-surface shadow-sm')}
        data-mol-id="investment-portfolio-mobile-header"
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
          )}
        >
          <Link
            to="/dashboard"
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}
          >
            <BrandWordmark as="span" />
          </Link>
          <UserMenu />
        </div>
        <nav
          aria-label={t('argentLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 2),
            'w-full overflow-x-auto pb-2',
          )}
          style={{ scrollbarWidth: 'none' }}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) =>
                cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'shrink-0 whitespace-nowrap rounded-full transition-colors',
                  isActive
                    ? cm.cn('bg-primary-container text-on-primary-container')
                    : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
                )
              }
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export function ArgentLayout() {
  const { t } = useTranslation()
  const navItems = useNavItems()
  const isDesktop = useIsDesktop()
  if (!isDesktop) return <MobileShell />
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('argentLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
