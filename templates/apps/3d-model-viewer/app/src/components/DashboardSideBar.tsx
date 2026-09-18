import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
export default function DashboardSideBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const activeClass =
    'border-l-[3px] border-primary text-on-surface bg-primary/10 px-6 py-4 flex items-center gap-4 scale-98 transition-transform duration-150'
  const inactiveClass =
    'text-on-surface-variant hover:text-on-surface px-6 py-4 flex items-center gap-4 hover:bg-surface/5 transition-colors duration-200'
  const navClass = (path: string) => (location.pathname === path ? activeClass : inactiveClass)
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'fixed h-full w-[260px] left-0 top-0 overflow-y-auto bg-surface-container-lowest shadow-[0_12px_40px_rgba(15,15,35,0.06)] z-50',
      )}
    >
      {/* Header */}
      <div className={cm.cn(cm.sp('p', 8), cm.sp('pb', 12), cm.flex({ align: 'center', gap: 4 }))}>
        <div
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.shrink0,
            'rounded-xl bg-gradient-to-br from-primary to-primary-container',
          )}
        >
          <span
            className="material-symbols-outlined text-on-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            view_in_ar
          </span>
        </div>
        <div>
          <h1 className={cm.cn(cm.textSize('2xl'), 'font-black tracking-tighter text-on-surface')}>
            {t('dashboardSideBar.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'text-foreground-tertiary uppercase tracking-widest',
            )}
          >
            {t('dashboardSideBar.appTagline', {}, { defaultValue: '3D Design Studio' })}
          </p>
        </div>
      </div>
      {/* Navigation Tabs */}
      <nav
        className={cm.cn(
          cm.flex1,
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          cm.flex({ direction: 'col' }),
          "font-['Inter'] tracking-tight",
        )}
      >
        {/* Active Tab: Dashboard */}
        <Link className={navClass('/dashboard')} to="/dashboard">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            dashboard
          </span>

          {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
        </Link>
        {/* Inactive Tabs */}
        <Link className={navClass('/models')} to="/models">
          <span className="material-symbols-outlined">view_in_ar</span>

          {t('nav.models', {}, { defaultValue: 'Models' })}
        </Link>
        <Link className={navClass('/upload')} to="/upload">
          <span className="material-symbols-outlined">cloud_upload</span>

          {t('common.upload', {}, { defaultValue: 'Upload' })}
        </Link>
        <Link className={navClass('/dashboard')} to="/dashboard">
          <span className="material-symbols-outlined">group</span>

          {t('nav.team', {}, { defaultValue: 'Team' })}
        </Link>
        <Link className={`${navClass('/settings')} mt-auto mb-4`} to="/settings">
          <span className="material-symbols-outlined">settings</span>

          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
      </nav>
    </aside>
  )
}
export { DashboardSideBar }
