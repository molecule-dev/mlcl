import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function SideNav() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const location = useLocation()
  const activeClass = cm.cn(
    cm.flex({ align: 'center', gap: 3 }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.fontWeight('semibold'),
    'text-sky-700 dark:text-sky-400 bg-border/50 dark:bg-sky-900/20 rounded-lg transition-all duration-200 ease-in-out active:scale-[0.98]',
  )
  const inactiveClass = cm.cn(
    cm.flex({ align: 'center', gap: 3 }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    'text-foreground-secondary hover:text-foreground transition-colors hover:bg-border/30 rounded-lg',
  )
  const navClass = (path: string) => (location.pathname === path ? activeClass : inactiveClass)
  return (
    <aside
      className={cm.cn(
        cm.h('screen'),
        cm.flex({ direction: 'col', gap: 2 }),
        cm.sp('p', 4),
        'w-[240px] fixed left-0 top-0 bg-surface-secondary z-50 overflow-y-auto border-r-0',
      )}
      data-mol-id="nav-side-1"
    >
      <div
        className={cm.cn(cm.sp('mb', 8), cm.sp('px', 4), cm.sp('py', 2))}
        data-mol-id="nav-side-header"
      >
        <h1
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'tracking-tighter text-foreground',
          )}
          data-mol-id="brand-name"
        >
          {t('sideNav.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'text-on-surface-variant uppercase tracking-widest opacity-70',
          )}
          data-mol-id="brand-sub"
        >
          {t('sideNav.brandTagline', {}, { defaultValue: 'Support Desk' })}
        </p>
      </div>
      <nav className={cm.cn(cm.flex1, cm.stack(1))} data-mol-id="nav-side-links">
        <Link className={navClass('/')} data-mol-id="nav-item-dashboard" to="/">
          <span className={cm.cn('material-symbols-outlined')} data-icon="dashboard">
            dashboard
          </span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </span>
        </Link>
        <Link className={navClass('/tickets')} data-mol-id="nav-item-tickets" to="/tickets">
          <span className={cm.cn('material-symbols-outlined')} data-icon="confirmation_number">
            confirmation_number
          </span>
          <span className={cm.fontWeight('medium')}>
            {t('sideNav.tickets', {}, { defaultValue: 'Tickets' })}
          </span>
        </Link>
        <Link
          className={navClass('/knowledge-base')}
          data-mol-id="nav-item-kb"
          to="/knowledge-base"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="book">
            book
          </span>
          <span className={cm.fontWeight('medium')}>
            {t('sideNav.knowledgeBase', {}, { defaultValue: 'Knowledge Base' })}
          </span>
        </Link>
        <Link className={navClass('/reports')} data-mol-id="nav-item-reports" to="/reports">
          <span className={cm.cn('material-symbols-outlined')} data-icon="bar_chart">
            bar_chart
          </span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.reports', {}, { defaultValue: 'Reports' })}
          </span>
        </Link>
      </nav>
      <div
        className={cm.cn(cm.sp('pt', 4), cm.stack(1), 'mt-auto border-t border-border/50')}
        data-mol-id="nav-side-footer"
      >
        <Link className={navClass('/settings')} data-mol-id="nav-item-settings" to="/settings">
          <span className={cm.cn('material-symbols-outlined')} data-icon="settings">
            settings
          </span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </span>
        </Link>
      </div>
    </aside>
  )
}
export default SideNav
