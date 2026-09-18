import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function ListingEditorSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('screen'),
        cm.w(64),
        cm.sp('py', 8),
        'fixed left-0 top-0 bg-surface-container-high border-r border-border/15',
      )}
    >
      <div className={cm.cn(cm.sp('px', 8), cm.sp('mb', 12))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mb', 2))}>
          <div
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-primary-container rounded-lg',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-primary-container')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              domain
            </span>
          </div>
          <div>
            <h1 className={cm.cn('font-black', 'font-headline text-success leading-none')}>
              {t(
                'listingEditorSideNavBar.brandName',
                { appName: APP_NAME },
                { defaultValue: '{{appName}}' },
              )}
            </h1>
            <p
              className={cm.cn(
                cm.fontWeight('medium'),
                cm.sp('mt', 1),
                'text-[10px] uppercase tracking-widest text-foreground-secondary',
              )}
            >
              {t('listingEditorSideNavBar.tagline', {}, { defaultValue: 'Agent Portal' })}
            </p>
          </div>
        </div>
      </div>
      <nav className={cm.cn(cm.flex1, cm.stack(1))}>
        <Link
          className={cm.cn(
            'flex items-center gap-3 text-foreground-secondary py-3 px-6 hover:text-success dark:hover:text-emerald-200 transition-all hover:bg-border/50',
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
            'flex items-center gap-3 bg-primary text-on-primary rounded-r-full py-3 px-6 -ml-4 border-l-4 border-primary-fixed translate-x-1 duration-300',
          )}
          to="/admin/listings"
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            data-icon="domain"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            domain
          </span>
          <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
            {t('nav.listings', {}, { defaultValue: 'Listings' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 text-foreground-secondary py-3 px-6 hover:text-success dark:hover:text-emerald-200 transition-all hover:bg-border/50',
          )}
          to="/admin/leads"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="person_search">
            person_search
          </span>
          <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
            {t('nav.leads', {}, { defaultValue: 'Leads' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 text-foreground-secondary py-3 px-6 hover:text-success dark:hover:text-emerald-200 transition-all hover:bg-border/50',
          )}
          to="/admin/showings"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="calendar_month">
            calendar_month
          </span>
          <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
            {t('nav.showings', {}, { defaultValue: 'Showings' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 text-foreground-secondary py-3 px-6 hover:text-success dark:hover:text-emerald-200 transition-all hover:bg-border/50',
          )}
          to="/admin/analytics"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="insert_chart">
            insert_chart
          </span>
          <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
            {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 text-foreground-secondary py-3 px-6 hover:text-success dark:hover:text-emerald-200 transition-all hover:bg-border/50',
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
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            'rounded-xl border border-outline-variant/15 text-primary hover:bg-surface-container-low transition-colors',
          )}
          type="button"
          onClick={() => navigate('/admin/showings')}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add_circle</span>
          {t('listingEditorSideNavBar.scheduleTour', {}, { defaultValue: 'Schedule Tour' })}
        </button>
        <div
          className={cm.cn(cm.sp('mt', 6), cm.sp('pt', 6), 'border-t border-outline-variant/10')}
        >
          <Link
            className={cm.cn(
              'flex items-center gap-3 text-foreground-secondary py-2 hover:text-primary transition-colors text-xs uppercase tracking-widest font-medium',
            )}
            to="/help"
          >
            <span
              className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
              data-icon="help"
            >
              help
            </span>
            {t('nav.helpCenter', {}, { defaultValue: 'Help Center' })}
          </Link>
        </div>
      </div>
    </aside>
  )
}
export default ListingEditorSideNavBar
export { ListingEditorSideNavBar }
