import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type SettingsTabId = 'profile' | 'security' | 'billing' | 'notifications' | 'apiKeys'

type SettingsTabsBarProps = {
  active: SettingsTabId
  onChange: (tab: SettingsTabId) => void
}

const tabs: SettingsTabId[] = ['profile', 'security', 'billing', 'notifications', 'apiKeys']

function SettingsTabsBar({ active, onChange }: SettingsTabsBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const label = (id: SettingsTabId) =>
    ({
      profile: t('nav.profile', {}, { defaultValue: 'Profile' }),
      security: t('nav.security', {}, { defaultValue: 'Security' }),
      billing: t('settings.billing', {}, { defaultValue: 'Billing' }),
      notifications: t('settings.notifications', {}, { defaultValue: 'Notifications' }),
      apiKeys: t('settingsTabs.apiKeys', {}, { defaultValue: 'API Keys' }),
    })[id]

  return (
    <div
      className={cm.cn(cm.flex(), 'flex-wrap gap-2 rounded-2xl bg-surface-container-low/60 p-1.5')}
      role="tablist"
      aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
    >
      {tabs.map((id) => {
        const isActive = id === active
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-xl transition-all',
              isActive
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface',
            )}
            onClick={() => onChange(id)}
          >
            {label(id)}
          </button>
        )
      })}
    </div>
  )
}

export default SettingsTabsBar
export { SettingsTabsBar }
