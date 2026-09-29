import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'
function SideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navClass = (path: string, base = 'flex items-center gap-3 px-4 py-2.5 rounded-full') =>
    pathname === path
      ? `${base} text-primary font-bold border-r-4 border-primary bg-surface-container-low/50`
      : `${base} text-on-background opacity-80 hover:bg-surface-container-low/50 transition-colors`
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('screen'),
        cm.w(64),
        cm.sp('py', 6),
        cm.fontWeight('medium'),
        "bg-surface-dim fixed left-0 top-0 font-['Inter'] text-[0.875rem] transition-all duration-200 ease-in-out",
      )}
    >
      <div className={cm.cn(cm.sp('px', 6), cm.sp('mb', 8))}>
        <BrandWordmark />
        <div
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest opacity-60',
          )}
        >
          {t('sideNavBar.appSubtitle', {}, { defaultValue: 'Enterprise Suite' })}
        </div>
      </div>
      <nav className={cm.cn(cm.flex1, cm.stack(1))}>
        <Link className={navClass('/')} to="/">
          <span className={cm.fv9c076a56}>dashboard</span>
          <span>{t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}</span>
        </Link>
        <Link className={navClass('/contacts')} to="/contacts">
          <span className={cm.fv9c076a56}>group</span>
          <span>{t('sideNavBar.contacts', {}, { defaultValue: 'Contacts' })}</span>
        </Link>
        <Link className={navClass('/companies')} to="/companies">
          <span className={cm.fv9c076a56}>business</span>
          <span>{t('sideNavBar.companies', {}, { defaultValue: 'Companies' })}</span>
        </Link>
        <Link className={navClass('/deals')} to="/deals">
          <span className={cm.fv9c076a56}>monetization_on</span>
          <span>{t('sideNavBar.deals', {}, { defaultValue: 'Deals' })}</span>
        </Link>
        <Link className={navClass('/activities')} to="/activities">
          <span className={cm.fv9c076a56}>event_note</span>
          <span>{t('sideNavBar.activities', {}, { defaultValue: 'Activities' })}</span>
        </Link>
        <Link className={navClass('/reports')} to="/reports">
          <span className={cm.fv9c076a56}>analytics</span>
          <span>{t('nav.reports', {}, { defaultValue: 'Reports' })}</span>
        </Link>
      </nav>
      <div className={cm.cn('mt-auto')}>
        <Link
          className={navClass('/settings', 'flex items-center gap-3 px-4 py-2.5 rounded-full')}
          to="/settings"
        >
          <span className={cm.fv9c076a56}>settings</span>
          <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
        </Link>
      </div>
    </aside>
  )
}

export default SideNavBar
export { SideNavBar }
