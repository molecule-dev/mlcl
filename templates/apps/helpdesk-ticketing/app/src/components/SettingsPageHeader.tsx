import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function SettingsPageHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div>
      <h2
        className={cm.cn(
          cm.textSize('4xl'),
          'font-extrabold tracking-tight text-on-surface leading-tight',
        )}
      >
        {t('nav.settings', {}, { defaultValue: 'Settings' })}
      </h2>
      <p className={cm.cn(cm.sp('mt', 2), cm.maxW('lg'), 'text-on-surface-variant')}>
        {t(
          'settingsPageHeader.description',
          { appName: APP_NAME },
          {
            defaultValue:
              'Manage your personal preferences, account security, and team permissions for the {{appName}} Support environment.',
          },
        )}
      </p>
    </div>
  )
}

export default SettingsPageHeader
export { SettingsPageHeader }
