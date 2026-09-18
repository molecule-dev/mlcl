import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function SettingsNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('profile')
  return (
    <aside className={cm.cn(cm.w(56), cm.shrink0)}>
      <nav className={cm.stack(1)}>
        <button
          onClick={() => setActiveTab('profile')}
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'text-left rounded transition-colors',
            activeTab === 'profile'
              ? cm.cn(cm.fontWeight('semibold'), cm.textPrimary, 'bg-surface-container-low')
              : 'text-on-surface-variant hover:bg-surface-container-low',
          )}
        >
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'text-left rounded transition-colors',
            activeTab === 'account'
              ? cm.cn(cm.fontWeight('semibold'), cm.textPrimary, 'bg-surface-container-low')
              : 'text-on-surface-variant hover:bg-surface-container-low',
          )}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'text-left rounded transition-colors',
            activeTab === 'notifications'
              ? cm.cn(cm.fontWeight('semibold'), cm.textPrimary, 'bg-surface-container-low')
              : 'text-on-surface-variant hover:bg-surface-container-low',
          )}
        >
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'text-left rounded transition-colors',
            activeTab === 'integrations'
              ? cm.cn(cm.fontWeight('semibold'), cm.textPrimary, 'bg-surface-container-low')
              : 'text-on-surface-variant hover:bg-surface-container-low',
          )}
        >
          {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'text-left rounded transition-colors',
            activeTab === 'team'
              ? cm.cn(cm.fontWeight('semibold'), cm.textPrimary, 'bg-surface-container-low')
              : 'text-on-surface-variant hover:bg-surface-container-low',
          )}
        >
          {t('nav.team', {}, { defaultValue: 'Team' })}
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'text-left rounded transition-colors',
            activeTab === 'billing'
              ? cm.cn(cm.fontWeight('semibold'), cm.textPrimary, 'bg-surface-container-low')
              : 'text-on-surface-variant hover:bg-surface-container-low',
          )}
        >
          {t('settings.billing', {}, { defaultValue: 'Billing' })}
        </button>
      </nav>
    </aside>
  )
}

export default SettingsNavBar
export { SettingsNavBar }
