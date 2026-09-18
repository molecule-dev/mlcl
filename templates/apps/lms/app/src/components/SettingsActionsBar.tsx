import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SettingsActionsBarProps {
  onSave: () => void
  onCancel: () => void
  loading: boolean
  savedAt: number | null
}
function SettingsActionsBar({ onSave, onCancel, loading, savedAt }: SettingsActionsBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 12),
        cm.sp('py', 6),
        'fixed bottom-0 right-0 w-[calc(100%-260px)] bg-surface/90 backdrop-blur-md border-t border-border z-40',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'text-foreground-tertiary')}>
        <span
          className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
          data-icon="info"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          info
        </span>
        <p className={cm.textSize('xs')}>
          {t(
            'settingsActionsBar.lastUpdated',
            { timeAgo: '4 days ago', location: 'London, UK' },
            { defaultValue: 'Last updated {{timeAgo}} from a device in {{location}}.' },
          )}
        </p>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 6 }))}>
        {savedAt && (
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-success')}>
            {t('common.saved', {}, { defaultValue: 'Saved' })}
          </span>
        )}
        <button
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'text-foreground-secondary hover:text-foreground font-headline transition-colors',
          )}
          onClick={onCancel}
          type="button"
        >
          {t('common.cancel', {}, { defaultValue: 'Cancel' })}
        </button>
        <button
          className={cm.cn(
            cm.sp('px', 10),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            'primary-gradient text-on-primary rounded-xl shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all font-headline',
          )}
          onClick={onSave}
          disabled={loading}
          type="button"
        >
          {loading
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('common.save', {}, { defaultValue: 'Save Changes' })}
        </button>
      </div>
    </div>
  )
}

export default SettingsActionsBar
export { SettingsActionsBar }
