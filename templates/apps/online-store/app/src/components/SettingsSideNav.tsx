import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SettingsSideNavProps {
  activeSection: string
  setActiveSection: (s: string) => void
}
export default function SettingsSideNav({ activeSection, setActiveSection }: SettingsSideNavProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.stack(1), 'lg:col-span-3')}>
      <a
        className={cm.cn(
          cm.flex({ align: 'center', gap: 3 }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-lg transition-all',
          activeSection === 'profile'
            ? cm.cn(cm.textPrimary, cm.fontWeight('bold'), 'bg-surface shadow-sm')
            : 'text-foreground-secondary hover:bg-surface hover:shadow-sm',
        )}
        data-mol-id="side-nav-profile"
        href="#profile"
        onClick={() => setActiveSection('profile')}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          person
        </span>
        {t('nav.profile', {}, { defaultValue: 'Profile' })}
      </a>
      <a
        className={cm.cn(
          cm.flex({ align: 'center', gap: 3 }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-lg transition-all',
          activeSection === 'security'
            ? cm.cn(cm.textPrimary, cm.fontWeight('bold'), 'bg-surface shadow-sm')
            : 'text-foreground-secondary hover:bg-surface hover:shadow-sm',
        )}
        data-mol-id="side-nav-security"
        href="#security"
        onClick={() => setActiveSection('security')}
      >
        <span className={cm.cn('material-symbols-outlined')}>security</span>
        {t('nav.security', {}, { defaultValue: 'Security' })}
      </a>
      <a
        className={cm.cn(
          cm.flex({ align: 'center', gap: 3 }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-lg transition-all',
          activeSection === 'notifications'
            ? cm.cn(cm.textPrimary, cm.fontWeight('bold'), 'bg-surface shadow-sm')
            : 'text-foreground-secondary hover:bg-surface hover:shadow-sm',
        )}
        data-mol-id="side-nav-notifications"
        href="#notifications"
        onClick={() => setActiveSection('notifications')}
      >
        <span className={cm.cn('material-symbols-outlined')}>notifications</span>
        {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
      </a>
      <Link
        className={cm.cn(
          cm.flex({ align: 'center', gap: 3 }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-lg transition-all',
          'text-foreground-secondary hover:bg-surface hover:shadow-sm',
        )}
        data-mol-id="side-nav-orders"
        to="/orders"
      >
        <span className={cm.cn('material-symbols-outlined')}>package_2</span>
        {t('settingsSideNav.orderHistory', {}, { defaultValue: 'Order History' })}
      </Link>
    </div>
  )
}
export { SettingsSideNav }
