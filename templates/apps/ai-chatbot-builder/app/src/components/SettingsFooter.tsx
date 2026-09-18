import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SettingsFooterProps {
  onSave: () => void
  onCancel: () => void
  saving: boolean
  savedAt: number | null
  saveError: string | null
}
function SettingsFooter({ onSave, onCancel, saving, savedAt, saveError }: SettingsFooterProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <footer
      className={cm.cn(
        cm.sp('pt', 8),
        cm.flex({ align: 'center', justify: 'end' }),
        'gap-6 border-t border-surface-container-high',
      )}
    >
      <button
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 3),
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'text-on-surface-variant hover:text-on-surface transition-colors',
        )}
        onClick={onCancel}
      >
        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
      </button>
      {savedAt && !saveError && (
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-tertiary')}>
          {t('common.saved', {}, { defaultValue: 'Saved' })}
        </span>
      )}
      {saveError && (
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-error')}>
          {saveError}
        </span>
      )}
      <button
        className={cm.cn(
          cm.sp('px', 10),
          cm.sp('py', 4),
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.roundedFull,
          'primary-gradient text-white shadow-xl shadow-primary/25 hover:scale-[1.03] active:scale-95 transition-all',
        )}
        onClick={onSave}
        disabled={saving}
      >
        {saving
          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
          : t('common.save', {}, { defaultValue: 'Save Changes' })}
      </button>
    </footer>
  )
}

export default SettingsFooter
export { SettingsFooter }
