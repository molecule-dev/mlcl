import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
function CrmSidebar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const __navigate = useNavigate()
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      await logout()
    } finally {
      __navigate('/login')
    }
  }
  return (
    <aside
      className={cm.cn(
        cm.h('screen'),
        cm.w(64),
        cm.flex({ direction: 'col' }),
        cm.sp('p', 4),
        'fixed left-0 top-0 overflow-y-auto bg-surface-secondary border-r border-border/50 z-50',
      )}
    >
      <div
        className={cm.cn(cm.flex({ align: 'center' }), cm.sp('px', 2), cm.sp('mb', 10), 'gap-3')}
      >
        <div
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-primary-container rounded-xl text-white shadow-lg',
          )}
        >
          <span className={cm.fv5b245ffa} data-icon="architecture">
            architecture
          </span>
        </div>
        <div>
          <h1 className={cm.cn(cm.textSize('lg'), 'font-black text-foreground leading-none')}>
            {APP_NAME}
          </h1>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'text-[10px] uppercase tracking-wider text-foreground-secondary',
            )}
          >
            {t('crmSidebar.edition', {}, { defaultValue: 'Enterprise Edition' })}
          </p>
        </div>
      </div>
      <nav className={cm.cn(cm.flex1, 'space-y-1')}>
        <Link className={cm.fv1b8b3ca4} data-mol-id="nav-dashboard" to="/">
          <span className={cm.fv5b245ffa} data-icon="dashboard">
            dashboard
          </span>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </span>
        </Link>
        <Link className={cm.fv62a95875} data-mol-id="nav-contacts" to="/contacts">
          <span className={cm.fv5b245ffa} data-icon="group">
            group
          </span>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {t('crmSidebar.navContacts', {}, { defaultValue: 'Contacts' })}
          </span>
        </Link>
        <Link className={cm.fv1b8b3ca4} data-mol-id="nav-deals" to="/deals">
          <span className={cm.fv5b245ffa} data-icon="handshake">
            handshake
          </span>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('crmSidebar.navDeals', {}, { defaultValue: 'Deals' })}
          </span>
        </Link>
        <Link className={cm.fv1b8b3ca4} data-mol-id="nav-analytics" to="/reports">
          <span className={cm.fv5b245ffa} data-icon="leaderboard">
            leaderboard
          </span>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
          </span>
        </Link>
        <Link className={cm.fv1b8b3ca4} data-mol-id="nav-reports" to="/reports">
          <span className={cm.fv5b245ffa} data-icon="description">
            description
          </span>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('nav.reports', {}, { defaultValue: 'Reports' })}
          </span>
        </Link>
      </nav>
      <div className={cm.cn(cm.sp('pt', 6), 'mt-auto space-y-1')}>
        <div
          className={cm.cn(
            cm.sp('p', 4),
            cm.sp('mb', 6),
            'bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl text-white shadow-xl relative overflow-hidden group',
          )}
        >
          <div className={cm.fv7a8ff926}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.sp('mb', 1),
                'opacity-80',
              )}
            >
              {t('crmSidebar.currentPlan', {}, { defaultValue: 'Current Plan' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
              {t('crmSidebar.planName', {}, { defaultValue: 'Enterprise Pro' })}
            </p>
            <button
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'bg-surface/20 hover:bg-surface/30 backdrop-blur-md rounded-lg transition-colors',
              )}
              data-mol-id="upgrade-cta"
              onClick={() => __navigate('/billing')}
            >
              {t('crmSidebar.upgradePlan', {}, { defaultValue: 'Upgrade Plan' })}
            </button>
          </div>
          <div
            className={cm.cn(
              cm.w(20),
              cm.h(20),
              'absolute -right-4 -bottom-4 bg-surface/10 rounded-full blur-2xl',
            )}
          ></div>
        </div>
        <Link className={cm.fvebad491d} data-mol-id="nav-help" to="/help">
          <span className={cm.fv5b245ffa} data-icon="help">
            help
          </span>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('crmSidebar.navHelp', {}, { defaultValue: 'Help Center' })}
          </span>
        </Link>
        <button
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            'gap-3 text-foreground-secondary hover:bg-border/50 rounded-lg transition-all duration-200 ease-in-out',
          )}
          data-mol-id="nav-logout"
          onClick={handleLogout}
        >
          <span className={cm.fv5b245ffa} data-icon="logout">
            logout
          </span>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('common.logout', {}, { defaultValue: 'Logout' })}
          </span>
        </button>
      </div>
    </aside>
  )
}
export default CrmSidebar
export { CrmSidebar }
