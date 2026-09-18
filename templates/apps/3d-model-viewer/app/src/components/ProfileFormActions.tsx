import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ProfileFormActionsProps {
  onSave: () => void
  onDiscard: () => void
  saving: boolean
}
function ProfileFormActions({ onSave, onDiscard, saving }: ProfileFormActionsProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
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
        type="button"
        onClick={onDiscard}
      >
        {t('common.discard', {}, { defaultValue: 'Discard' })}
      </button>
      <button
        data-testid="profile-save"
        className={cm.cn(
          cm.sp('px', 6),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'py-2.5 rounded-lg text-on-primary bg-gradient-to-r from-primary to-primary-container hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(124,58,237,0.3)] disabled:opacity-50',
        )}
        type="button"
        onClick={onSave}
        disabled={saving}
      >
        {saving
          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
          : t('common.save', {}, { defaultValue: 'Save Changes' })}
      </button>
    </div>
  )
}

export default ProfileFormActions
export { ProfileFormActions }
