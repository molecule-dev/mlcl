import React from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function AgentAnalyticsSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('py', 8),
        cm.h('screen'),
        cm.w(64),
        'fixed left-0 top-0 bg-success-light hidden md:flex',
      )}
    >
      <div className={cm.cn(cm.sp('px', 8), cm.sp('mb', 12))}>
        <h1
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'text-success tracking-tighter',
          )}
        >
          {t(
            'agentAnalyticsSideNavBar.title',
            { appName: APP_NAME },
            { defaultValue: '{{appName}}' },
          )}
        </h1>
        <p
          className={cm.cn(
            cm.fontWeight('medium'),
            'text-[10px] uppercase tracking-widest text-success/50',
          )}
        >
          {t('agentAnalyticsSideNavBar.subtitle', {}, { defaultValue: 'Agent Portal' })}
        </p>
      </div>
      <nav className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.flex1)}>
        <Link
          className={cm.cn(
            'text-success/70 flex items-center gap-3 py-3 px-6 hover:bg-success-light/30 dark:hover:bg-emerald-800/10 transition-all',
          )}
          to="/admin/dashboard"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="dashboard">
            dashboard
          </span>
          <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'text-success/70 flex items-center gap-3 py-3 px-6 hover:bg-success-light/30 dark:hover:bg-emerald-800/10 transition-all',
          )}
          to="/admin/listings"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="domain">
            domain
          </span>
          <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
            {t('agentAnalyticsSideNavBar.listings', {}, { defaultValue: 'Listings' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'text-success/70 flex items-center gap-3 py-3 px-6 hover:bg-success-light/30 dark:hover:bg-emerald-800/10 transition-all',
          )}
          to="/admin/leads"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="groups">
            groups
          </span>
          <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
            {t('agentAnalyticsSideNavBar.leads', {}, { defaultValue: 'Leads' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'text-success/70 flex items-center gap-3 py-3 px-6 hover:bg-success-light/30 dark:hover:bg-emerald-800/10 transition-all',
          )}
          to="/admin/showings"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="calendar_today">
            calendar_today
          </span>
          <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
            {t('agentAnalyticsSideNavBar.showings', {}, { defaultValue: 'Showings' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'text-success flex items-center gap-3 py-3 px-6 bg-success-light/50 rounded-r-full',
          )}
          to="/admin/analytics"
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            data-icon="analytics"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            analytics
          </span>
          <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
            {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'text-success/70 flex items-center gap-3 py-3 px-6 hover:bg-success-light/30 dark:hover:bg-emerald-800/10 transition-all',
          )}
          to="/admin/settings"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="settings">
            settings
          </span>
          <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </span>
        </Link>
      </nav>
      <div className={cm.cn(cm.sp('px', 6), 'mt-auto')}>
        <button
          onClick={() => navigate('/admin/listings/new')}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('py', 3),
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.w('full'),
            'bg-gradient-to-br from-primary to-primary-container text-on-primary',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')} data-icon="add">
            add
          </span>
          <span>
            {t('agentAnalyticsSideNavBar.newListing', {}, { defaultValue: 'New Listing' })}
          </span>
        </button>
      </div>
    </aside>
  )
}

export default AgentAnalyticsSideNavBar
export { AgentAnalyticsSideNavBar }
