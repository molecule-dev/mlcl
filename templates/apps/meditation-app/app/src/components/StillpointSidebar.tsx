import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

export interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  filledIcon?: boolean
}

export const PRIMARY_ITEMS: NavItem[] = [
  {
    to: '/home',
    icon: 'self_improvement',
    labelKey: 'stillpoint.nav.home',
    defaultLabel: 'Today',
    filledIcon: true,
  },
  { to: '/library', icon: 'spa', labelKey: 'stillpoint.nav.library', defaultLabel: 'Library' },
  { to: '/courses', icon: 'school', labelKey: 'stillpoint.nav.courses', defaultLabel: 'Courses' },
  {
    to: '/journal',
    icon: 'edit_note',
    labelKey: 'stillpoint.nav.journal',
    defaultLabel: 'Journal',
  },
  { to: '/stats', icon: 'insights', labelKey: 'stillpoint.nav.stats', defaultLabel: 'Stats' },
  { to: '/search', icon: 'search', labelKey: 'stillpoint.nav.search', defaultLabel: 'Search' },
]

export const SECONDARY_ITEMS: NavItem[] = [
  {
    to: '/notifications',
    icon: 'notifications',
    labelKey: 'stillpoint.nav.notifications',
    defaultLabel: 'Notifications',
  },
  {
    to: '/profile',
    icon: 'account_circle',
    labelKey: 'stillpoint.nav.profile',
    defaultLabel: 'Profile',
  },
  {
    to: '/settings',
    icon: 'settings',
    labelKey: 'stillpoint.nav.settings',
    defaultLabel: 'Settings',
  },
]

/**
 * Brand-consistent left rail for Stillpoint's signed-in surfaces.
 *
 * Soft lavender wash, indigo wordmark + tagline, pill-shaped active state in
 * primary indigo with white text. Hidden below md (mobile uses a top bar).
 *
 * Translated from calorie-counter's NoshSidebar.tsx.
 */
export function StillpointSidebar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`)

  const renderItem = (item: NavItem) => {
    const active = isActive(item.to)
    return (
      <li key={item.to}>
        <Link
          to={item.to}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-xl transition-colors duration-200 active:scale-95',
            active
              ? 'bg-primary text-white font-semibold shadow-sm'
              : 'text-on-surface hover:bg-primary-container/60',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined')}
            style={item.filledIcon || active ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {item.icon}
          </span>
          <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
        </Link>
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
      <Link to="/home" className={cm.cn(cm.sp('px', 2), cm.sp('mb', 6), 'block')}>
        <span
          className={cm.cn(cm.fontWeight('bold'), 'text-2xl text-primary tracking-tight block')}
        >
          {APP_NAME}
        </span>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'block text-primary font-medium tracking-wide uppercase mt-1',
          )}
        >
          {t('stillpoint.nav.tagline', {}, { defaultValue: APP_TAGLINE })}
        </span>
      </Link>

      <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none')}>
        {PRIMARY_ITEMS.map(renderItem)}
      </ul>

      <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none mt-auto')}>
        {SECONDARY_ITEMS.map(renderItem)}
      </ul>
    </nav>
  )
}
