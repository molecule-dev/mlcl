import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
function ModelEditSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <aside
      className={cm.cn(
        // Hidden below md — mobile chrome is the bottom tab bar (MobileBottomNav).
        'hidden md:flex flex-col',
        cm.sp('py', 4),
        cm.h('screen'),
        cm.w('[260px]'),
        'fixed left-0 top-0 bg-surface-container-low border-none z-50',
      )}
    >
      <div className={cm.cn(cm.sp('mb', 8), cm.sp('px', 6))}>
        <h1 className={cm.cn(cm.textSize('xl'), 'font-bold tracking-tighter text-on-background')}>
          {t('app.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </h1>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            "font-['Inter'] tracking-tight text-[0.6875rem] uppercase text-on-primary-container dark:text-inverse-primary",
          )}
        >
          {t('nav.appSubtitle', {}, { defaultValue: '3D Design Studio' })}
        </p>
      </div>
      <nav className={cm.cn(cm.flex1, cm.flex({ direction: 'col', gap: 1 }))}>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container transition-all duration-200 active:scale-95 duration-150 ease-in-out',
          )}
          to="/dashboard"
        >
          <span className="material-symbols-outlined text-[20px]" data-icon="dashboard">
            dashboard
          </span>
          {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 bg-surface-container-highest dark:bg-primary-container/20 text-primary dark:text-inverse-primary rounded-lg font-bold hover:bg-surface-container transition-all duration-200 active:scale-95 duration-150 ease-in-out',
          )}
          to="/models"
        >
          <span
            className="material-symbols-outlined text-[20px]"
            data-icon="view_in_ar"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            view_in_ar
          </span>
          {t('nav.models', {}, { defaultValue: 'Models' })}
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container transition-all duration-200 active:scale-95 duration-150 ease-in-out',
          )}
          to="/upload"
        >
          <span className="material-symbols-outlined text-[20px]" data-icon="cloud_upload">
            cloud_upload
          </span>
          {t('common.upload', {}, { defaultValue: 'Upload' })}
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container transition-all duration-200 active:scale-95 duration-150 ease-in-out mt-auto',
          )}
          to="/settings"
        >
          <span className="material-symbols-outlined text-[20px]" data-icon="settings">
            settings
          </span>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
      </nav>
    </aside>
  )
}

export default ModelEditSideNavBar
export { ModelEditSideNavBar }
