import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  filledIcon?: boolean
}

const PRIMARY_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    icon: 'dashboard',
    labelKey: 'forja.nav.dashboard',
    defaultLabel: 'Dashboard',
  },
  {
    to: '/workout/active',
    icon: 'fitness_center',
    labelKey: 'forja.nav.activeWorkout',
    defaultLabel: 'Active Workout',
    filledIcon: true,
  },
  {
    to: '/exercises',
    icon: 'sports_gymnastics',
    labelKey: 'forja.nav.exercises',
    defaultLabel: 'Exercises',
  },
  {
    to: '/templates',
    icon: 'list_alt',
    labelKey: 'forja.nav.templates',
    defaultLabel: 'Templates',
  },
  { to: '/history', icon: 'event_note', labelKey: 'forja.nav.history', defaultLabel: 'History' },
  { to: '/records', icon: 'emoji_events', labelKey: 'forja.nav.records', defaultLabel: 'Records' },
  {
    to: '/measurements',
    icon: 'monitor_weight',
    labelKey: 'forja.nav.measurements',
    defaultLabel: 'Measurements',
  },
]

const SECONDARY_ITEMS: NavItem[] = [
  { to: '/settings', icon: 'settings', labelKey: 'forja.nav.settings', defaultLabel: 'Settings' },
]

/**
 * Brand-consistent left rail for Forja's signed-in surfaces.
 *
 * Charcoal accent panel on a near-black background, orange wordmark + small
 * tagline stamped like a workshop mark, pill-shaped active state in primary
 * orange. Hidden below md (mobile uses the top bar only).
 *
 * Translated from calorie-counter's NoshSidebar.tsx.
 */
export function ForjaSidebar() {
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
              ? 'bg-primary text-on-primary font-semibold shadow-sm'
              : 'text-white/80 hover:bg-surface/5 hover:text-white',
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
        'fixed left-0 top-0 h-screen w-[260px] bg-accent text-white z-30 hidden md:flex',
      )}
    >
      <Link to="/dashboard" className={cm.cn(cm.sp('px', 2), cm.sp('mb', 6), 'block')}>
        <span className={cm.cn('block text-3xl font-black text-primary tracking-tight')}>
          {APP_NAME}
        </span>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'block text-white/60 font-bold tracking-[0.18em] uppercase mt-1',
          )}
        >
          {t('forja.nav.tagline', {}, { defaultValue: APP_TAGLINE })}
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
