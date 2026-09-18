import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
}

const NAV_SECTIONS: Array<{ key: string; defaultLabel: string; items: NavItem[] }> = [
  {
    key: 'overview',
    defaultLabel: 'Overview',
    items: [
      { to: '/dashboard', icon: 'dashboard', labelKey: 'dashboard', defaultLabel: 'Dashboard' },
      { to: '/objectives', icon: 'flag', labelKey: 'objectives', defaultLabel: 'Objectives' },
      { to: '/check-in', icon: 'fact_check', labelKey: 'checkIn', defaultLabel: 'Weekly check-in' },
    ],
  },
  {
    key: 'team',
    defaultLabel: 'Team',
    items: [
      { to: '/team', icon: 'groups', labelKey: 'team', defaultLabel: 'Team' },
      { to: '/reviews', icon: 'rate_review', labelKey: 'reviews', defaultLabel: 'Reviews' },
      {
        to: '/notifications',
        icon: 'notifications',
        labelKey: 'notifications',
        defaultLabel: 'Notifications',
      },
    ],
  },
  {
    key: 'account',
    defaultLabel: 'Account',
    items: [
      { to: '/profile', icon: 'person', labelKey: 'profile', defaultLabel: 'Profile' },
      { to: '/settings', icon: 'settings', labelKey: 'settings', defaultLabel: 'Settings' },
      {
        to: '/settings/billing',
        icon: 'credit_card',
        labelKey: 'billing',
        defaultLabel: 'Billing',
      },
    ],
  },
]

/**
 * Dark indigo sidebar — section headers in widget caps, active item gets
 * an indigo background pill + sky text, inactive items hover at 8% white.
 * Translated from crm/SideNavBar.tsx + project-management/SideNavBar.tsx,
 * recolored to the Ascent palette (#1e1b4b sidebar, #818cf8 section heads).
 */
export function AscentSideNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('screen'),
        'sticky top-0 left-0 w-[260px] shrink-0 text-primary-light',
      )}
      style={{ backgroundColor: 'var(--color-nav-bg)' }}
    >
      <Link
        to="/dashboard"
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 6), cm.sp('py', 6))}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/30',
          )}
        >
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            arrow_upward
          </span>
        </div>
        <div className={cm.flex({ direction: 'col' })}>
          <span className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-white')}>
            {APP_NAME}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-indigo-300/70 font-bold">
            {APP_TAGLINE}
          </span>
        </div>
      </Link>

      <nav className={cm.cn(cm.flex1, cm.sp('px', 4), cm.stack(6), 'overflow-y-auto')}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.key} className={cm.stack(1)}>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-[0.18em] text-indigo-400 px-3 mb-2',
              )}
            >
              {t(
                `ascentSideNav.section.${section.key}` as 'ascentSideNav.section.overview',
                {},
                { defaultValue: section.defaultLabel },
              )}
            </p>
            {section.items.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + '/')
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'rounded-lg transition-colors duration-150',
                    active
                      ? 'bg-indigo-500/20 text-white shadow-inner'
                      : 'text-indigo-100/80 hover:bg-surface/8 hover:text-white',
                  )}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-[20px]',
                      active && 'text-sky-300',
                    )}
                    style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">
                    {t(
                      `ascentSideNav.nav.${item.labelKey}` as 'ascentSideNav.nav.dashboard',
                      {},
                      { defaultValue: item.defaultLabel },
                    )}
                  </span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className={cm.cn(cm.sp('p', 4))}>
        <Link
          to="/objectives/new"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-xl text-white bg-gradient-to-br from-indigo-500 to-sky-500 shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.99] transition-transform',
          )}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {t('ascentSideNav.newObjective', {}, { defaultValue: 'New objective' })}
        </Link>
      </div>
    </aside>
  )
}

export default AscentSideNav
