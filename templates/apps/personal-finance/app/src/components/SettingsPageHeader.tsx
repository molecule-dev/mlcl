import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SettingsPageHeader({
  onSave,
  saving,
  savedAt,
}: {
  onSave: () => void
  saving: boolean
  savedAt: number | null
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }))}>
      <div>
        <h1
          className={cm.cn(
            cm.sp('mb', 2),
            cm.textSize('4xl'),
            'font-extrabold font-headline tracking-tight text-on-surface',
          )}
        >
          {t('settingsPageHeader.title')}
        </h1>
        <p className={cm.cn('text-on-surface-variant')}>{t('settingsPageHeader.subtitle')}</p>
      </div>
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        {savedAt && (
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-success')}>
            {t('common.saved')}
          </span>
        )}
        <button
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'bg-gradient-to-br from-primary to-primary-container text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all',
          )}
          onClick={onSave}
          disabled={saving}
        >
          {saving ? t('common.saving') : t('common.saveChanges')}
        </button>
      </div>
    </div>
  )
}

export default SettingsPageHeader
export { SettingsPageHeader }
