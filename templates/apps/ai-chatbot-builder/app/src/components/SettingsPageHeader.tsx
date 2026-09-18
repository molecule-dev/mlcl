import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SettingsPageHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header>
      <h2
        className={cm.cn(
          cm.textSize('4xl'),
          'font-headline font-extrabold text-on-surface tracking-tight',
        )}
      >
        {t('nav.settings', {}, { defaultValue: 'Settings' })}
      </h2>
    </header>
  )
}

export default SettingsPageHeader
export { SettingsPageHeader }
