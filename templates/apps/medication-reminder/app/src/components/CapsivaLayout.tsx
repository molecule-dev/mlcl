import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'
import { BrandWordmark } from './BrandWordmark.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Today', icon: 'today' },
  { to: '/medications', key: 'medications', defaultLabel: 'Medications', icon: 'medication' },
  { to: '/schedule', key: 'schedule', defaultLabel: 'Schedule', icon: 'event' },
  { to: '/refills', key: 'refills', defaultLabel: 'Refills', icon: 'pill' },
  { to: '/reports', key: 'reports', defaultLabel: 'Adherence', icon: 'insights' },
  { to: '/caregivers', key: 'caregivers', defaultLabel: 'Caregivers', icon: 'group' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * The shared SidebarLayout is a fixed-width flex row with no mobile collapse:
 * at phone widths the 240px aside crowds the routed page into ~150px. Below
 * 768px we therefore render a template-local mobile shell instead — a sticky
 * top bar (brand + theme + user menu) with a horizontally scrollable chip nav
 * row under it. Rendered via matchMedia so only ONE shell is ever mounted
 * (the routed page never mounts twice).
 */
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
    label: t(`capsivaLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
}

/**
 * Mobile shell (< 768px): sticky brand bar + scrollable chip nav. The chip row
 * is width-constrained and scrolls within itself, so the page never overflows
 * horizontally at 390px. Chips are ≥40px tall for touch (this app's users are
 * often older adults).
 */
function MobileShell() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navItems = useNavItems()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <header
        className={cm.cn('sticky top-0 z-40 bg-surface shadow-sm')}
        data-mol-id="capsiva-mobile-header"
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
          )}
        >
          <Link to="/dashboard" className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            <BrandWordmark as="span" />
          </Link>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        <nav
          aria-label={t(
            'capsivaLayout.primaryNavLabel',
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
              data-mol-id={`nav-${item.key}`}
              className={({ isActive }) =>
                cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'shrink-0 whitespace-nowrap rounded-full transition-colors min-h-[40px]',
                  isActive
                    ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
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

export function CapsivaLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navItems = useNavItems()
  const isDesktop = useIsDesktop()
  if (!isDesktop) return <MobileShell />
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <ThemeToggle />
          <UserMenu />
        </div>
      }
      navAriaLabel={t('capsivaLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
