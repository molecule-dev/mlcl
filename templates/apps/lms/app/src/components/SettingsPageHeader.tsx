import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SettingsPageHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div>
      <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}>
        {t('nav.settings', {}, { defaultValue: 'Settings' })}
      </h1>
      <p className={cm.cn(cm.sp('mt', 1), 'text-foreground-secondary font-body')}>
        {t(
          'settingsPageHeader.description',
          {},
          { defaultValue: 'Manage your academic profile and application preferences.' },
        )}
      </p>
    </div>
  )
}

export default SettingsPageHeader
export { SettingsPageHeader }
