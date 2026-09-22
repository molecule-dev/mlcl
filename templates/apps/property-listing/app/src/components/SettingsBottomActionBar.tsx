import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SettingsBottomActionBarProps {
  onSave: () => void
  onDiscard: () => void
  saving?: boolean
  successMessage?: string
  errorMessage?: string
}
function SettingsBottomActionBar({
  onSave,
  onDiscard,
  saving,
  successMessage,
  errorMessage,
}: SettingsBottomActionBarProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ justify: 'end' }),
        cm.sp('px', 12),
        cm.sp('py', 6),
        'fixed bottom-0 left-0 md:left-64 right-0 bg-background/90 backdrop-blur-md z-40 border-t border-border/10',
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        {errorMessage && (
          <p role="alert" className={cm.cn(cm.textSize('sm'), cm.sp('mr', 2), 'text-error')}>
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p role="status" className={cm.cn(cm.textSize('sm'), cm.sp('mr', 2), 'text-success')}>
            {successMessage}
          </p>
        )}
        <button
          className={cm.cn(
            cm.sp('px', 10),
            cm.sp('py', 4),
            cm.textPrimary,
            cm.fontWeight('bold'),
            cm.roundedFull,
            'hover:bg-surface-container-high transition-colors',
          )}
          onClick={onDiscard}
          disabled={saving}
        >
          {t('common.discard', {}, { defaultValue: 'Discard Changes' })}
        </button>
        <button
          className={cm.cn(
            cm.sp('px', 12),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'bg-primary-gradient text-on-primary shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all',
          )}
          onClick={onSave}
          disabled={saving}
        >
          {saving
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('common.save', {}, { defaultValue: 'Save Changes' })}
        </button>
      </div>
    </div>
  )
}

export default SettingsBottomActionBar
export { SettingsBottomActionBar }
