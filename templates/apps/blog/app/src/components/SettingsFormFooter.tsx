import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface SettingsFormFooterProps {
  onSave: () => void
  loading: boolean
  onCancel: () => void
}
function SettingsFormFooter({ onSave, loading, onCancel }: SettingsFormFooterProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <footer
      className={cm.cn(
        cm.flex({ justify: 'end', gap: 'md' }),
        cm.sp('pt', 12),
        'mt-20 border-t border-surface-container',
      )}
    >
      <button
        className={cm.cn(
          cm.fontWeight('semibold'),
          cm.textSize('sm'),
          cm.sp('px', 6),
          cm.sp('py', 2),
          'text-on-surface-variant font-label hover:text-on-surface transition-colors',
        )}
        data-mol-id="cancel-settings"
        onClick={onCancel}
      >
        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
      </button>
      <button
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 3),
          cm.fontWeight('bold'),
          cm.textSize('sm'),
          'bg-primary text-on-primary rounded-lg font-label shadow-lg hover:translate-y-[-2px] transition-transform',
        )}
        data-mol-id="save-settings-bottom"
        onClick={onSave}
        disabled={loading}
      >
        {loading
          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
          : t('common.save', {}, { defaultValue: 'Save Changes' })}
      </button>
    </footer>
  )
}

export default SettingsFormFooter
export { SettingsFormFooter }
