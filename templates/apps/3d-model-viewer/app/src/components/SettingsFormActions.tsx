import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SettingsFormActionsProps {
  onSave: () => void
  onDiscard: () => void
  saving: boolean
}
function SettingsFormActions({ onSave, onDiscard, saving }: SettingsFormActionsProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'end', gap: 4 }),
        cm.sp('pt', 6),
        'border-t border-outline-variant/10',
      )}
    >
      <button
        className={cm.cn(
          cm.sp('px', 5),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'py-2.5 text-on-surface-variant hover:text-on-surface transition-colors',
        )}
        onClick={onDiscard}
        disabled={saving}
      >
        {t('common.discard', {}, { defaultValue: 'Discard' })}
      </button>
      <button
        className={cm.cn(
          cm.sp('px', 6),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'py-2.5 rounded-lg text-on-primary bg-gradient-to-r from-primary to-primary-container hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(124,58,237,0.3)]',
        )}
        onClick={onSave}
        disabled={saving}
      >
        {saving
          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
          : t('common.saveChanges', {}, { defaultValue: 'Save Changes' })}
      </button>
    </div>
  )
}

export default SettingsFormActions
export { SettingsFormActions }
