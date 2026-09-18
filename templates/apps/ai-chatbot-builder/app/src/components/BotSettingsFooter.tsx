import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface BotSettingsFooterProps {
  onSave: () => void
  onDiscard: () => void
  saving: boolean
  savedAt: number | null
}
function BotSettingsFooter({ onSave, onDiscard, saving, savedAt }: BotSettingsFooterProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      {/* Fixed Footer */}
      <footer
        className={cm.cn(
          cm.sp('py', 6),
          cm.sp('px', 12),
          'fixed bottom-0 right-0 left-64 bg-background/80 backdrop-blur-md z-20',
        )}
      >
        <div className={cm.cn('max-w-5xl', cm.mxAuto, cm.flex({ justify: 'end' }), 'gap-6')}>
          {savedAt && (
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-tertiary')}>
              {t('common.saved', {}, { defaultValue: 'Saved' })}
            </span>
          )}
          <button
            onClick={onDiscard}
            disabled={saving}
            className={cm.cn(
              cm.sp('px', 8),
              cm.fontWeight('bold'),
              'py-3.5 text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50',
            )}
          >
            {t('common.discardChanges', {}, { defaultValue: 'Discard Changes' })}
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className={cm.cn(
              cm.sp('px', 10),
              cm.fontWeight('bold'),
              'py-3.5 bg-gradient-to-r from-primary to-tertiary-fixed-dim text-white rounded-3xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100',
            )}
          >
            {t('common.saveChanges', {}, { defaultValue: 'Save Changes' })}
          </button>
        </div>
      </footer>
    </>
  )
}

export default BotSettingsFooter
export { BotSettingsFooter }
