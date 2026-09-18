import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
function UploadSideNavBar() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <nav
      aria-label={t('uploadSideNavBar.navLabel', {}, { defaultValue: 'Sidebar Navigation' })}
      className={cm.cn(
        cm.sp('py', 6),
        'hidden md:flex flex-col fixed left-0 top-0 h-full z-40 w-[260px] bg-surface-container-lowest border-r border-outline-variant shadow-2xl rounded-r-xl',
      )}
    >
      {/* Header */}
      <div className={cm.cn(cm.sp('px', 6), cm.sp('mb', 8), cm.flex({ direction: 'col', gap: 2 }))}>
        <div
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 2 }),
            'text-on-surface tracking-wider',
          )}
        >
          <span className="material-symbols-outlined text-primary">view_in_ar</span>
          {t('app.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </div>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'text-foreground-tertiary uppercase tracking-widest font-mono',
          )}
        >
          {t('nav.appSubtitle', {}, { defaultValue: '3D Design Studio' })}
        </span>
      </div>
      {/* CTA */}
      <div className={cm.cn(cm.sp('px', 4), cm.sp('mb', 8))}>
        <button
          onClick={() => navigate('/upload')}
          className={cm.cn(
            cm.w('full'),
            cm.fontWeight('medium'),
            cm.sp('px', 4),
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            'bg-gradient-to-r from-primary to-primary-container text-on-primary py-2.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity',
          )}
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          {t('header.uploadModel', {}, { defaultValue: 'Upload Model' })}
        </button>
      </div>
      {/* Main Nav Tabs */}
      <ul
        className={cm.cn(
          cm.flex1,
          cm.flex({ direction: 'col', gap: 1 }),
          cm.sp('px', 3),
          cm.textSize('sm'),
        )}
      >
        <li>
          <Link
            className={cm.cn(
              'flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface/5 hover:text-on-surface transition-all duration-200 rounded-lg font-medium',
            )}
            to="/dashboard"
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </Link>
        </li>
        <li>
          {/* Active State applied here based on logic */}
          <Link
            aria-current="page"
            className={cm.cn(
              'flex items-center gap-3 bg-primary/20 text-on-primary-container border-r-2 border-primary px-4 py-3 rounded-lg font-bold active:scale-95 duration-150',
            )}
            to="/upload"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              upload_file
            </span>
            {t('common.upload', {}, { defaultValue: 'Upload' })}
          </Link>
        </li>
        <li>
          <Link
            className={cm.cn(
              'flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface/5 hover:text-on-surface transition-all duration-200 rounded-lg font-medium',
            )}
            to="/models"
          >
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            {t('nav.library', {}, { defaultValue: 'Library' })}
          </Link>
        </li>
        {/* "Render" and "Analytics" were placeholder duplicates of Upload and
        Dashboard — removed so every nav item is a distinct, real destination. */}
        <li>
          <Link
            className={cm.cn(
              'flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface/5 hover:text-on-surface transition-all duration-200 rounded-lg font-medium',
            )}
            to="/notifications"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </Link>
        </li>
      </ul>
      {/* Footer Nav Tabs */}
      <ul
        className={cm.cn(
          cm.sp('px', 3),
          cm.flex({ direction: 'col', gap: 1 }),
          cm.textSize('sm'),
          'mt-auto font-mono uppercase tracking-wider',
        )}
      >
        <li>
          <Link
            className={cm.cn(
              'flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface/5 hover:text-on-surface transition-all duration-200 rounded-lg font-medium',
            )}
            to="/about"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
            {t('uploadSideNavBar.support', {}, { defaultValue: 'Support' })}
          </Link>
        </li>
        <li>
          <Link
            className={cm.cn(
              'flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface/5 hover:text-on-surface transition-all duration-200 rounded-lg font-medium',
            )}
            to="/settings"
          >
            <span className="material-symbols-outlined text-[20px]">account_circle</span>
            {t('settings.account', {}, { defaultValue: 'Account' })}
          </Link>
        </li>
      </ul>
    </nav>
  )
}

export default UploadSideNavBar
export { UploadSideNavBar }
