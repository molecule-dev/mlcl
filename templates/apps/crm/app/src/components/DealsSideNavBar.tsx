import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function DealsSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('pb', 6),
        cm.textSize('sm'),
        cm.fontWeight('medium'),
        cm.w(64),
        cm.h('full'),
        "bg-surface-secondary border-r border-border fixed left-0 top-0 pt-20 z-40 font-['Inter']",
      )}
      data-mol-id="sidebar-main"
    >
      <div className={cm.cn(cm.sp('px', 6), cm.sp('mb', 8))}>
        <h1 className={cm.cn(cm.textSize('xl'), 'font-black text-foreground')}>
          {t('dealsSideNavBar.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </h1>
        <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-foreground-secondary')}>
          {t('dealsSideNavBar.brandSubtitle', {}, { defaultValue: 'PRECISION ARCHITECTED DATA' })}
        </p>
      </div>
      <nav className={cm.cn(cm.flex1, cm.stack(1))}>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'text-foreground-secondary gap-3 hover:bg-border/50 rounded-full transition-all duration-150 ease-in-out',
          )}
          data-mol-id="nav-dashboard"
          to="/"
        >
          <span className={cm.fv5b245ffa} style={{ fontSize: '20px' }}>
            dashboard
          </span>
          <span>{t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}</span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'bg-blue-600/10 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full font-bold gap-3 transition-all duration-150 ease-in-out',
          )}
          data-mol-id="nav-deals"
          to="/deals"
        >
          <span className={cm.fv5b245ffa} style={{ fontSize: '20px' }}>
            payments
          </span>
          <span>{t('dealsSideNavBar.navDeals', {}, { defaultValue: 'Deals' })}</span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'text-foreground-secondary gap-3 hover:bg-border/50 rounded-full transition-all duration-150 ease-in-out',
          )}
          data-mol-id="nav-contacts"
          to="/contacts"
        >
          <span className={cm.fv5b245ffa} style={{ fontSize: '20px' }}>
            group
          </span>
          <span>{t('dealsSideNavBar.navContacts', {}, { defaultValue: 'Contacts' })}</span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'text-foreground-secondary gap-3 hover:bg-border/50 rounded-full transition-all duration-150 ease-in-out',
          )}
          data-mol-id="nav-companies"
          to="/companies"
        >
          <span className={cm.fv5b245ffa} style={{ fontSize: '20px' }}>
            business
          </span>
          <span>{t('dealsSideNavBar.navCompanies', {}, { defaultValue: 'Companies' })}</span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'text-foreground-secondary gap-3 hover:bg-border/50 rounded-full transition-all duration-150 ease-in-out',
          )}
          data-mol-id="nav-tasks"
          to="/tasks"
        >
          <span className={cm.fv5b245ffa} style={{ fontSize: '20px' }}>
            assignment
          </span>
          <span>{t('dealsSideNavBar.navTasks', {}, { defaultValue: 'Tasks' })}</span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'text-foreground-secondary gap-3 hover:bg-border/50 rounded-full transition-all duration-150 ease-in-out',
          )}
          data-mol-id="nav-analytics"
          to="/analytics"
        >
          <span className={cm.fv5b245ffa} style={{ fontSize: '20px' }}>
            insights
          </span>
          <span>{t('nav.analytics', {}, { defaultValue: 'Analytics' })}</span>
        </Link>
      </nav>
      <div className={cm.cn(cm.sp('px', 4), 'mt-auto')}>
        <div className={cm.cn(cm.sp('p', 4), cm.sp('mb', 4), 'bg-primary/5 rounded-xl')}>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'text-[10px] uppercase tracking-wider text-primary',
            )}
          >
            {t('dealsSideNavBar.tierLabel', {}, { defaultValue: 'Standard Tier' })}
          </p>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mb', 3), 'text-on-surface/70')}>
            {t(
              'dealsSideNavBar.upgradeDescription',
              {},
              { defaultValue: 'Optimize your workflow with advanced features.' },
            )}
          </p>
          <button
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-primary text-white rounded-lg hover:bg-primary-container transition-colors',
            )}
            data-mol-id="cta-upgrade"
            onClick={() => {
              // TODO: wire when billing/upgrade endpoint exists
            }}
          >
            {t('dealsSideNavBar.upgradeButton', {}, { defaultValue: 'Upgrade Plan' })}
          </button>
        </div>
        <div className={cm.stack(1)}>
          <Link
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'text-foreground-secondary gap-3 hover:bg-border/50 rounded-full',
            )}
            data-mol-id="footer-support"
            to="/support"
          >
            <span className={cm.fv5b245ffa} style={{ fontSize: '20px' }}>
              contact_support
            </span>
            <span>{t('dealsSideNavBar.navSupport', {}, { defaultValue: 'Support' })}</span>
          </Link>
          <Link
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'text-foreground-secondary gap-3 hover:bg-border/50 rounded-lg',
            )}
            data-mol-id="footer-settings"
            to="/settings"
          >
            <span className={cm.fv5b245ffa} style={{ fontSize: '20px' }}>
              settings
            </span>
            <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
          </Link>
        </div>
      </div>
    </aside>
  )
}

export default DealsSideNavBar
export { DealsSideNavBar }
