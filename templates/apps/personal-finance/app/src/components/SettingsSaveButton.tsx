import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SettingsSaveButton({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.sp('mt', 12), cm.flex({ justify: 'center' }), 'lg:hidden')}>
      <button
        className={cm.cn(
          cm.w('full'),
          cm.sp('py', 4),
          cm.fontWeight('bold'),
          cm.textSize('base'),
          'bg-gradient-to-br from-primary to-primary-container text-white rounded-xl tracking-wide ambient-shadow active:scale-95 transition-all',
        )}
        onClick={onSave}
        disabled={saving}
      >
        {saving ? t('common.saving') : t('common.saveChanges')}
      </button>
    </div>
  )
}

export default SettingsSaveButton
export { SettingsSaveButton }
