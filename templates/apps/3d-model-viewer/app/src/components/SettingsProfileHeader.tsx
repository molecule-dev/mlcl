import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SettingsProfileHeader() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.sp('mb', 8)}>
      <h1
        className={cm.cn(
          cm.textSize('3xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 2),
          'font-headline text-on-surface tracking-tight',
        )}
      >
        {t('nav.profile', {}, { defaultValue: 'Profile' })}
      </h1>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant font-body')}>
        {t(
          'settingsProfileHeader.subtitle',
          {},
          { defaultValue: 'Manage your public presence and renderer preferences.' },
        )}
      </p>
    </div>
  )
}

export default SettingsProfileHeader
export { SettingsProfileHeader }
