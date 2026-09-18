import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AdminSettingsPageHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header className={cm.sp('mb', 8)}>
      <h1 className={cm.cn(cm.textSize('3xl'), 'font-black text-foreground tracking-tight')}>
        {t('adminSettingsPageHeader.title', {}, { defaultValue: 'Store Settings' })}
      </h1>
      <p className={cm.cn(cm.sp('mt', 1), 'text-foreground-secondary')}>
        {t(
          'adminSettingsPageHeader.subtitle',
          {},
          { defaultValue: 'Manage your store configuration and preferences' },
        )}
      </p>
    </header>
  )
}

export default AdminSettingsPageHeader
export { AdminSettingsPageHeader }
