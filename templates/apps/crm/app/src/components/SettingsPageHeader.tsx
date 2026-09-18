import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SettingsPageHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.sp('mb', 8)}>
      <h2
        className={cm.cn(
          cm.textSize('3xl'),
          cm.sp('mb', 2),
          'font-extrabold text-on-surface tracking-tight',
        )}
      >
        {t('nav.settings', {}, { defaultValue: 'Settings' })}
      </h2>
      <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}>
        {t(
          'settingsPageHeader.description',
          {},
          { defaultValue: 'Manage your workspace configuration and personal profile preferences.' },
        )}
      </p>
    </div>
  )
}

export default SettingsPageHeader
export { SettingsPageHeader }
