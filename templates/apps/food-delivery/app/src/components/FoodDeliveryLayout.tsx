import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { TopNavLayout } from '@molecule/app-top-nav-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/restaurants', key: 'browse', defaultLabel: 'Browse', icon: 'storefront' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/orders', key: 'orders', defaultLabel: 'Orders', icon: 'receipt_long' },
  { to: '/favorites', key: 'favorites', defaultLabel: 'Favorites', icon: 'favorite' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
] as const

/** Below 1024px the labeled inline nav overflows the viewport (it needs
 * ~800px), so narrower screens get the template-local mobile shell instead:
 * sticky top bar (brand + theme + user menu) with a horizontally scrollable
 * chip nav row under it. Rendered via matchMedia — only one shell is ever
 * mounted, so the routed page never mounts twice. */
const DESKTOP_QUERY = '(min-width: 1024px)'

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
    label: t(`foodDeliveryLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
}

/**
 * Mobile shell (< 1024px): sticky brand bar + scrollable chip nav. The chip
 * row is width-constrained and scrolls within itself, so the page never
 * overflows horizontally the way the inline labeled nav did at 390/768px.
 */
function MobileShell() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navItems = useNavItems()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <header
        className={cm.cn('sticky top-0 z-40 bg-surface shadow-sm')}
        data-mol-id="food-delivery-mobile-header"
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
          )}
        >
          <Link to="/restaurants" className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {APP_NAME}
          </Link>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        <nav
          aria-label={t(
            'foodDeliveryLayout.primaryNavLabel',
            {},
            { defaultValue: 'Primary navigation' },
          )}
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
                    ? cm.cn('bg-primary-container', cm.textPrimary)
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

export function FoodDeliveryLayout() {
  const { t } = useTranslation()
  const navItems = useNavItems()
  const isDesktop = useIsDesktop()
  if (!isDesktop) return <MobileShell />
  return (
    <TopNavLayout
      appName={APP_NAME}
      logoTo="/restaurants"
      navItems={navItems}
      userMenu={
        <>
          <ThemeToggle />
          <UserMenu />
        </>
      }
      navAriaLabel={t(
        'foodDeliveryLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
