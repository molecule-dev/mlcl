import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
function SettingsSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navCls = (path: string, extra = '') =>
    [
      'flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-surface/5 transition-all duration-200 active:scale-95',
      pathname === path
        ? 'text-on-primary-container font-bold bg-primary/20 border-r-2 border-primary'
        : 'text-on-surface-variant font-medium hover:text-on-surface',
      extra,
    ]
      .filter(Boolean)
      .join(' ')
  return (
    <nav
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.w('[260px]'),
        cm.h('screen'),
        'fixed left-0 top-0 bg-surface-container-lowest h-full overflow-y-auto shadow-[40px_0_40px_-5px_rgba(17,17,37,0.08)] z-50',
      )}
    >
      <div
        className={cm.cn(
          cm.textSize('2xl'),
          cm.sp('px', 6),
          cm.sp('py', 8),
          'font-black tracking-tighter text-on-surface font-headline',
        )}
      >
        {APP_NAME}
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('normal'),
            cm.sp('mt', 1),
            'block text-foreground-secondary tracking-normal font-body',
          )}
        >
          V0.1.4-BETA
        </span>
      </div>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 1 }),
          cm.flex1,
          cm.sp('px', 3),
          cm.textSize('sm'),
          'font-headline tracking-tight',
        )}
      >
        {/* Inactive */}
        <Link className={navCls('/signup')} to="/signup">
          <span className="material-symbols-outlined text-[20px]">person</span>
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </Link>
        <Link className={navCls('/settings')} to="/settings">
          <span className="material-symbols-outlined text-[20px]">security</span>
          {t('nav.security', {}, { defaultValue: 'Security' })}
        </Link>
        <Link className={navCls('/notifications')} to="/notifications">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </Link>
        <Link className={navCls('/settings')} to="/settings">
          <span className="material-symbols-outlined text-[20px]">payments</span>
          {t('settings.billing', {}, { defaultValue: 'Billing' })}
        </Link>
        <Link className={navCls('/settings')} to="/settings">
          <span className="material-symbols-outlined text-[20px]">extension</span>
          {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
        </Link>
        <Link className={navCls('/settings', 'mt-auto mb-4')} to="/settings">
          <span className="material-symbols-outlined text-[20px]">settings</span>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
      </div>
    </nav>
  )
}

export default SettingsSideNavBar
export { SettingsSideNavBar }
