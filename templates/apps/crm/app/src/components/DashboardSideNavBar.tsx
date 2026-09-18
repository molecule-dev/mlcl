import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
export default function DashboardSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('py', 6),
        cm.sp('px', 4),
        cm.shrink0,
        'w-64 h-screen border-r-0 bg-border/50 h-full overflow-y-auto',
      )}
    >
      <div className={cm.cn(cm.sp('mb', 8), cm.sp('px', 2), cm.flex({ align: 'center' }), 'gap-3')}>
        <div
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-primary rounded-lg text-white',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            dataset
          </span>
        </div>
        <h1 className={cm.cn(cm.textSize('xl'), 'font-black text-blue-800 tracking-tight')}>
          {APP_NAME}
        </h1>
      </div>
      <nav className={cm.cn(cm.flex1, cm.stack(1))}>
        <Link className={cm.fv1d0bb218} data-mol-id="nav-dashboard" to="/">
          <span className={cm.fv9c076a56} style={{ fontVariationSettings: "'FILL' 1" }}>
            dashboard
          </span>
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'font-sans tracking-tight')}
          >
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </span>
        </Link>
        <Link className={cm.fv42908fa0} data-mol-id="nav-contacts" to="/contacts">
          <span className={cm.fv9c076a56}>person</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-sans tracking-tight',
            )}
          >
            {t('dashboardSideNavBar.navContacts', {}, { defaultValue: 'Contacts' })}
          </span>
        </Link>
        <Link className={cm.fv42908fa0} data-mol-id="nav-companies" to="/companies">
          <span className={cm.fv9c076a56}>domain</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-sans tracking-tight',
            )}
          >
            {t('dashboardSideNavBar.navCompanies', {}, { defaultValue: 'Companies' })}
          </span>
        </Link>
        <Link className={cm.fv42908fa0} data-mol-id="nav-deals" to="/deals">
          <span className={cm.fv9c076a56}>handshake</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-sans tracking-tight',
            )}
          >
            {t('dashboardSideNavBar.navDeals', {}, { defaultValue: 'Deals' })}
          </span>
        </Link>
        <Link className={cm.fv42908fa0} data-mol-id="nav-activities" to="/activities">
          <span className={cm.fv9c076a56}>event_note</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-sans tracking-tight',
            )}
          >
            {t('dashboardSideNavBar.navActivities', {}, { defaultValue: 'Activities' })}
          </span>
        </Link>
      </nav>
      <div className={cm.cn(cm.sp('pt', 6), 'mt-auto border-t border-border-secondary/50')}>
        <Link className={cm.fv42908fa0} data-mol-id="nav-settings" to="/settings">
          <span className={cm.fv9c076a56}>settings</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-sans tracking-tight',
            )}
          >
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </span>
        </Link>
        <div
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.flex({ align: 'center' }),
            'bg-surface-container rounded-xl gap-3',
          )}
        >
          <img
            alt={t('dashboardSideNavBar.logoAlt', {}, { defaultValue: 'CRM Logo' })}
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'object-cover border border-surface',
            )}
            data-alt="portrait of a professional executive with glasses in a modern office environment, soft natural lighting"
            src="https://picsum.photos/seed/DashboardSideNavBar-1/1200/800"
          />
          <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface truncate',
              )}
            >
              Alex Sterling
            </span>
            <span className={cm.fv4d7208d4}>
              {t('dashboardSideNavBar.adminRole', {}, { defaultValue: 'Admin Access' })}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
export { DashboardSideNavBar }
