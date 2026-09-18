import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
function SettingsSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('py', 6),
        cm.textSize('sm'),
        cm.fontWeight('medium'),
        cm.shrink0,
        'bg-surface-dim h-screen w-64 sticky left-0 top-0 space-y-1 font-inter tracking-normal',
      )}
    >
      <div className={cm.cn(cm.sp('px', 6), cm.sp('mb', 8))}>
        <h1 className={cm.cn(cm.textSize('xl'), 'font-black text-on-background tracking-tight')}>
          {APP_NAME}
        </h1>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-[0.2em] text-on-background/50',
          )}
        >
          {t('settingsSideNavBar.adminRole', {}, { defaultValue: 'System Admin' })}
        </p>
      </div>
      <nav className={cm.fv9488c167}>
        {/* Dashboard */}
        <Link className={cm.fv2ef92287} to="/">
          <span
            className={cm.cn('text-[20px]', cm.sp('mr', 3), 'material-symbols-outlined')}
            data-icon="dashboard"
          >
            dashboard
          </span>
          <span>{t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}</span>
        </Link>
        {/* Contacts */}
        <Link className={cm.fv2ef92287} to="/contacts">
          <span
            className={cm.cn('text-[20px]', cm.sp('mr', 3), 'material-symbols-outlined')}
            data-icon="person"
          >
            person
          </span>
          <span>{t('settingsSideNavBar.navContacts', {}, { defaultValue: 'Contacts' })}</span>
        </Link>
        {/* Companies */}
        <Link className={cm.fv2ef92287} to="/companies">
          <span
            className={cm.cn('text-[20px]', cm.sp('mr', 3), 'material-symbols-outlined')}
            data-icon="domain"
          >
            domain
          </span>
          <span>{t('settingsSideNavBar.navCompanies', {}, { defaultValue: 'Companies' })}</span>
        </Link>
        {/* Deals */}
        <Link className={cm.fv2ef92287} to="/deals">
          <span
            className={cm.cn('text-[20px]', cm.sp('mr', 3), 'material-symbols-outlined')}
            data-icon="handshake"
          >
            handshake
          </span>
          <span>{t('settingsSideNavBar.navDeals', {}, { defaultValue: 'Deals' })}</span>
        </Link>
        {/* Activities */}
        <Link className={cm.fv2ef92287} to="/activities">
          <span
            className={cm.cn('text-[20px]', cm.sp('mr', 3), 'material-symbols-outlined')}
            data-icon="event_note"
          >
            event_note
          </span>
          <span>{t('settingsSideNavBar.navActivities', {}, { defaultValue: 'Activities' })}</span>
        </Link>
        {/* Reports */}
        <Link className={cm.fv2ef92287} to="/reports">
          <span
            className={cm.cn('text-[20px]', cm.sp('mr', 3), 'material-symbols-outlined')}
            data-icon="analytics"
          >
            analytics
          </span>
          <span>{t('nav.reports', {}, { defaultValue: 'Reports' })}</span>
        </Link>
        {/* Settings (ACTIVE) */}
        <Link className={cm.fv2fda9bd9} to="/settings">
          <span
            className={cm.cn('text-[20px]', cm.sp('mr', 3), 'material-symbols-outlined')}
            data-icon="settings"
          >
            settings
          </span>
          <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
        </Link>
      </nav>
      <div className={cm.cn(cm.sp('px', 6), cm.sp('pt', 6), 'mt-auto')}>
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.flex({ align: 'center' }),
            'bg-surface-container-lowest/40 rounded-xl gap-3',
          )}
        >
          <img
            alt={t('nav.profile', {}, { defaultValue: 'Profile' })}
            className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'object-cover')}
            data-alt="Close up portrait of a professional man in a blue shirt with soft office lighting background"
            src="https://picsum.photos/seed/SettingsSideNavBar-1/1200/800"
          />
          <div className={cm.fv92852dd5}>
            <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'truncate')}>
              {t('settingsSideNavBar.userName', {}, { defaultValue: 'Alex Sterling' })}
            </p>
            <p className={cm.fvfe1fd7a5}>
              {t('settingsSideNavBar.userTitle', {}, { defaultValue: 'Lead Architect' })}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default SettingsSideNavBar
export { SettingsSideNavBar }
