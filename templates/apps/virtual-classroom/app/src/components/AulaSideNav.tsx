import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * Building blocks for the shared `ResponsiveAppShell` — brand block, nav
 * links, and the weekly-quota footer card. The layout hands the SAME nav
 * element to `ResponsiveAppShell.Sidebar` (≥768px) and `.Drawer` (<768px),
 * so only the mounted breakpoint instantiates it and the nav `data-mol-id`s
 * never duplicate in the DOM.
 *
 * Formerly a self-contained fixed sidebar + mobile drawer (backdrop div,
 * off-canvas transforms, Escape handler, close button, open/onClose props);
 * the shell owns all of that now.
 */
type NavItem = {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  matches: (path: string) => boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    icon: 'dashboard',
    labelKey: 'aulaSideNav.dashboard',
    defaultLabel: 'Dashboard',
    matches: (p) => p === '/' || p === '/dashboard',
  },
  {
    to: '/courses',
    icon: 'school',
    labelKey: 'aulaSideNav.courses',
    defaultLabel: 'Courses',
    matches: (p) => p === '/courses' || p.startsWith('/courses/'),
  },
  {
    to: '/assignments',
    icon: 'assignment',
    labelKey: 'aulaSideNav.assignments',
    defaultLabel: 'Assignments',
    matches: (p) => p.startsWith('/assignments'),
  },
  {
    to: '/calendar',
    icon: 'calendar_month',
    labelKey: 'aulaSideNav.calendar',
    defaultLabel: 'Calendar',
    matches: (p) => p.startsWith('/calendar'),
  },
  {
    to: '/grades',
    icon: 'grade',
    labelKey: 'aulaSideNav.grades',
    defaultLabel: 'Grades',
    matches: (p) => p.startsWith('/grades'),
  },
  {
    to: '/notifications',
    icon: 'notifications',
    labelKey: 'aulaSideNav.notifications',
    defaultLabel: 'Notifications',
    matches: (p) => p.startsWith('/notifications'),
  },
  {
    to: '/settings',
    icon: 'settings',
    labelKey: 'aulaSideNav.settings',
    defaultLabel: 'Settings',
    matches: (p) => p.startsWith('/settings'),
  },
]

/**
 * Brand block — gradient mark + app name, with the tagline unless `compact`
 * (the mobile top bar slot). Links home like the old sidebar brand row.
 */
export function AulaBrand({ compact = false }: { compact?: boolean }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link to="/dashboard" className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
      <div
        className={cm.cn(
          'h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/20',
        )}
        aria-hidden="true"
      >
        <span
          className={cm.cn('material-symbols-outlined text-[20px] text-on-primary')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          cast_for_education
        </span>
      </div>
      <div className={cm.flex({ direction: 'col' })}>
        <span
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'text-primary leading-none tracking-tight',
          )}
        >
          {APP_NAME}
        </span>
        {!compact ? (
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-none mt-1')}>
            {t('aulaSideNav.tagline', {}, { defaultValue: APP_TAGLINE })}
          </span>
        ) : null}
      </div>
    </Link>
  )
}

/**
 * The nav links — handed to BOTH shell surfaces (`ResponsiveAppShell.Sidebar`
 * and `.Drawer`); only the mounted breakpoint instantiates it. The shell
 * closes the drawer on navigation, so the links no longer carry an onClick.
 */
export function AulaNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const itemBase = cm.cn(
    cm.flex({ align: 'center', gap: 3 }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.textSize('sm'),
    'rounded-xl transition-all duration-200',
  )
  const itemInactive = cm.cn(
    itemBase,
    'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
  )
  const itemActive = cm.cn(
    itemBase,
    cm.fontWeight('semibold'),
    'bg-primary-container text-on-primary-container shadow-sm',
  )

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive = item.matches(pathname)
        return (
          <Link
            key={item.to}
            to={item.to}
            className={isActive ? itemActive : itemInactive}
            data-mol-id={`nav-${item.icon}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[20px]')}
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
          </Link>
        )
      })}
    </>
  )
}

/**
 * Per-week class-quota progress card — the shell surfaces' `footer` slot
 * (below the `<nav>` landmark on the Sidebar; the Drawer's bordered footer).
 */
export function AulaNavFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 4),
        'rounded-2xl bg-gradient-to-br from-primary-container to-secondary-container/60 text-on-primary-container',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 2))}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest opacity-80',
          )}
        >
          {t('aulaSideNav.weeklyClasses', {}, { defaultValue: 'This week' })}
        </span>
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}>
          {t(
            'aulaSideNav.weeklyClassesCount',
            { done: 7, total: 12 },
            { defaultValue: '{{done}} / {{total}}' },
          )}
        </span>
      </div>
      <div className={cm.cn(cm.w('full'), cm.roundedFull, 'h-2 bg-surface/30 overflow-hidden')}>
        <div
          className={cm.cn(cm.h('full'), 'bg-gradient-to-r from-primary to-secondary')}
          style={{ width: '58%' }}
        ></div>
      </div>
      <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 3), 'opacity-90 leading-snug')}>
        {t(
          'aulaSideNav.weeklyHelp',
          {},
          { defaultValue: "You're on track to finish this week's lessons. Keep going!" },
        )}
      </p>
    </div>
  )
}
