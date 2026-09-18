import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  {
    to: '/dashboard',
    key: 'dashboard',
    defaultLabel: 'Dashboard',
    icon: 'dashboard',
    molId: 'nav-dashboard',
  },
  {
    to: '/pipeline',
    key: 'pipeline',
    defaultLabel: 'Pipeline',
    icon: 'view_kanban',
    molId: 'nav-pipeline',
  },
  { to: '/jobs', key: 'jobs', defaultLabel: 'Jobs', icon: 'work', molId: 'nav-jobs' },
  {
    to: '/candidates',
    key: 'candidates',
    defaultLabel: 'Candidates',
    icon: 'group',
    molId: 'nav-candidates',
  },
  {
    to: '/interviews',
    key: 'interviews',
    defaultLabel: 'Interviews',
    icon: 'event',
    molId: 'nav-interviews',
  },
  {
    to: '/reports',
    key: 'reports',
    defaultLabel: 'Reports',
    icon: 'bar_chart',
    molId: 'nav-reports',
  },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
    molId: 'nav-notifications',
  },
  {
    to: '/settings',
    key: 'settings',
    defaultLabel: 'Settings',
    icon: 'settings',
    molId: 'nav-settings',
  },
] as const

export function ShortlistLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'row' }),
        'bg-background text-on-surface antialiased',
      )}
      data-mol-id="shortlist-layout"
    >
      <aside
        className={cm.cn(
          cm.sp('p', 4),
          cm.shrink0,
          cm.flex({ direction: 'col' }),
          'w-60 bg-surface border-r border-outline-variant',
        )}
        data-mol-id="side-nav"
      >
        <Link
          to={safeTarget('/dashboard')}
          data-mol-id="nav-app-home"
          className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), 'block')}
        >
          {APP_NAME}
        </Link>

        <nav
          className={cm.cn(cm.flex1, 'space-y-1')}
          aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
        >
          {NAV_KEYS.map((item) => {
            const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`)
            return (
              <Link
                key={item.key}
                to={safeTarget(item.to)}
                data-mol-id={item.molId}
                aria-current={isActive ? 'page' : undefined}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'rounded-md transition-colors',
                  isActive
                    ? 'bg-primary-container text-on-primary-container'
                    : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
                )}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {item.icon}
                </span>
                <span>
                  {t(`shortlistLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
                </span>
              </Link>
            )
          })}
        </nav>

        <div
          className={cm.cn(
            cm.sp('pt', 4),
            cm.flex({ align: 'center', gap: 'sm', justify: 'end' }),
            'border-t border-outline-variant',
          )}
        >
          <ThemeToggle />
        </div>

        <div className={cm.sp('pt', 3)}>
          <UserMenu />
        </div>
      </aside>

      <main className={cm.cn(cm.flex1, 'min-w-0 overflow-y-auto')}>
        <Outlet />
      </main>
    </div>
  )
}
