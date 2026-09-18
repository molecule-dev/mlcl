import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function SettingsPageHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header className={cm.cn(cm.sp('mb', 16))}>
      <h1
        className={cm.cn(
          'text-5xl',
          cm.fontWeight('bold'),
          cm.sp('mb', 2),
          'font-headline tracking-tight text-on-background',
        )}
      >
        {t('settingsPageHeader.title', {}, { defaultValue: 'Account Settings' })}
      </h1>
      <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant font-body')}>
        {t(
          'settingsPageHeader.subtitle',
          {},
          { defaultValue: 'Manage your digital presence and editorial preferences.' },
        )}
      </p>
    </header>
  )
}

export default SettingsPageHeader
export { SettingsPageHeader }
