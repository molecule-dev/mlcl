import React from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export default function SettingsSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('py', 8),
        cm.w(64),
        cm.h('screen'),
        'fixed left-0 top-0 border-r border-border/15 bg-background z-50 hidden md:flex',
      )}
    >
      <div className={cm.cn(cm.sp('mb', 12), cm.sp('px', 8))}>
        <h1
          className={cm.cn(
            cm.textSize('xl'),
            'font-black tracking-tighter text-primary font-headline',
          )}
        >
          {t('app.title', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </h1>
        <p
          className={cm.cn(
            cm.fontWeight('medium'),
            cm.textSize('xs'),
            cm.sp('mt', 1),
            'text-foreground-secondary uppercase tracking-widest',
          )}
        >
          {t('app.subtitle', {}, { defaultValue: 'Agent Portal' })}
        </p>
      </div>
      <nav
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'xs' }),
          cm.flex1,
          cm.fontWeight('medium'),
          cm.textSize('sm'),
        )}
      >
        <Link
          className={cm.cn(
            'flex items-center gap-3 text-foreground-secondary px-6 py-3 hover:bg-surface-secondary transition-all',
          )}
          to="/admin/dashboard"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="dashboard">
            dashboard
          </span>

          {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 text-foreground-secondary px-6 py-3 hover:bg-surface-secondary transition-all',
          )}
          to="/admin/listings"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="real_estate_agent">
            real_estate_agent
          </span>

          {t('nav.listings', {}, { defaultValue: 'Listings' })}
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 text-foreground-secondary px-6 py-3 hover:bg-surface-secondary transition-all',
          )}
          to="/admin/leads"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="group">
            group
          </span>

          {t('nav.leads', {}, { defaultValue: 'Leads' })}
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 text-foreground-secondary px-6 py-3 hover:bg-surface-secondary transition-all',
          )}
          to="/admin/showings"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="calendar_today">
            calendar_today
          </span>

          {t('nav.showings', {}, { defaultValue: 'Showings' })}
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 text-foreground-secondary px-6 py-3 hover:bg-surface-secondary transition-all',
          )}
          to="/admin/analytics"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="analytics">
            analytics
          </span>

          {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
        </Link>
        {/* Active State */}
        <Link
          className={cm.cn(
            'font-bold flex items-center gap-3 bg-primary text-on-primary rounded-r-full px-6 py-3 transition-all duration-300',
          )}
          to="/admin/settings"
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            data-icon="settings"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            settings
          </span>

          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
      </nav>
      <div className={cm.cn(cm.sp('pt', 6), cm.sp('px', 6), 'mt-auto')}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <img
            alt={t('profile.imageAlt', {}, { defaultValue: 'Agent Profile Picture' })}
            className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
            data-alt="Professional portrait of a luxury real estate agent in a tailored suit, soft studio lighting, high-end editorial style"
            src="https://picsum.photos/seed/SettingsSideNavBar-1/1200/800"
          />
          <div>
            <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}>
              {t('profile.name', {}, { defaultValue: 'Julian Vane' })}
            </p>
            <p className={cm.cn('text-[10px] text-foreground-secondary')}>
              {t('profile.role', {}, { defaultValue: 'Managing Partner' })}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
export { SettingsSideNavBar }
