import { useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'

/** Shared signed-in nav model — the mobile tab bar (NoshMobileNav) renders the same set. */
export interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  filledIcon?: boolean
}

export const PRIMARY_ITEMS: NavItem[] = [
  { to: '/today', icon: 'calendar_today', labelKey: 'nosh.nav.today', defaultLabel: 'Today' },
  {
    to: '/log',
    icon: 'add_circle',
    labelKey: 'nosh.nav.logFood',
    defaultLabel: 'Log Food',
    filledIcon: true,
  },
  { to: '/progress', icon: 'leaderboard', labelKey: 'nosh.nav.progress', defaultLabel: 'Progress' },
  { to: '/goals', icon: 'flag', labelKey: 'nosh.nav.goals', defaultLabel: 'Goals' },
  { to: '/recipes', icon: 'menu_book', labelKey: 'nosh.nav.recipes', defaultLabel: 'Recipes' },
  { to: '/weight', icon: 'monitor_weight', labelKey: 'nosh.nav.weight', defaultLabel: 'Weight' },
]

const SECONDARY_ITEMS: NavItem[] = [
  { to: '/settings', icon: 'settings', labelKey: 'nosh.nav.settings', defaultLabel: 'Settings' },
]

/**
 * Brand-consistent left rail for Nosh's signed-in surfaces.
 *
 * Teal-50 background, teal wordmark + tagline, pill-shaped active state in
 * teal-600 with white text. Hidden below md (mobile uses a top bar only).
 */
export function NoshSidebar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`)

  const renderItem = (item: NavItem) => {
    const active = isActive(item.to)
    return (
      <li key={item.to}>
        <SafeLink
          to={item.to}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-xl transition-colors duration-200 active:scale-95',
            active
              ? 'bg-primary text-white font-semibold shadow-sm'
              : 'text-on-surface hover:bg-primary-container/50',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined')}
            style={item.filledIcon ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {item.icon}
          </span>
          <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
        </SafeLink>
      </li>
    )
  }

  return (
    <nav
      aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 4),
        'fixed left-0 top-0 h-screen w-[240px] border-r border-primary-container bg-surface-secondary z-30 hidden md:flex',
      )}
    >
      <SafeLink to="/today" className={cm.cn(cm.sp('px', 2), cm.sp('mb', 6), 'block')}>
        <span
          className={cm.cn(cm.fontWeight('bold'), 'text-2xl text-primary tracking-tight block')}
        >
          {APP_NAME}
        </span>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'block text-primary/70 font-medium tracking-wide uppercase mt-1',
          )}
        >
          {t('nosh.nav.tagline', {}, { defaultValue: 'Friendly tracking' })}
        </span>
      </SafeLink>

      <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none')}>
        {PRIMARY_ITEMS.map(renderItem)}
      </ul>

      <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none mt-auto')}>
        {SECONDARY_ITEMS.map(renderItem)}
      </ul>
    </nav>
  )
}
