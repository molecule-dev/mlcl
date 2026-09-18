import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SettingsPageHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header className={cm.cn(cm.sp('mb', 8))}>
      <h2
        className={cm.cn(
          'text-5xl',
          cm.textPrimary,
          cm.sp('mb', 2),
          'font-extrabold tracking-tight',
        )}
      >
        {t('nav.settings', {}, { defaultValue: 'Settings' })}
      </h2>
      <p className={cm.cn('text-on-surface-variant')}>
        {t(
          'settingsPageHeader.subtitle',
          {},
          { defaultValue: 'Manage your elite agent profile and preferences.' },
        )}
      </p>
    </header>
  )
}

export default SettingsPageHeader
export { SettingsPageHeader }
