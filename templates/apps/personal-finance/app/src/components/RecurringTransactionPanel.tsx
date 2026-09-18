import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type RecurringPanelValue = { enabled: boolean; frequency: string }

function RecurringTransactionPanel({
  enabled,
  frequency,
  onChange,
}: {
  enabled: boolean
  frequency: string
  onChange: (next: RecurringPanelValue) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        cm.flex({ align: 'center', justify: 'between' }),
        'bg-surface-container-low rounded-2xl',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-surface shadow-sm',
          )}
        >
          <span className={cm.cn(cm.textPrimary, 'material-symbols-outlined')} data-weight="fill">
            sync
          </span>
        </div>
        <div>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('recurringTransactionPanel.title', {}, { defaultValue: 'Recurring Transaction' })}
          </p>
          <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-outline')}>
            {t(
              'recurringTransactionPanel.subtitle',
              {},
              { defaultValue: 'Automatically add this every period' },
            )}
          </p>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
        <select
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('px', 4),
            cm.sp('py', 2),
            'bg-surface border-none rounded-lg uppercase tracking-wider focus:ring-2 focus:ring-primary/20 text-on-surface',
          )}
          value={frequency}
          onChange={(e) => onChange({ enabled, frequency: e.target.value })}
        >
          <option value="Weekly">
            {t('common.frequency.weekly', {}, { defaultValue: 'Weekly' })}
          </option>
          <option value="Monthly">{t('status.monthly', {}, { defaultValue: 'Monthly' })}</option>
          <option value="Yearly">
            {t('common.frequency.yearly', {}, { defaultValue: 'Yearly' })}
          </option>
        </select>
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(6),
            cm.roundedFull,
            cm.cursorPointer,
            'relative transition-colors',
          )}
          style={{
            backgroundColor: enabled
              ? 'var(--color-primary, var(--mol-color-primary))'
              : 'var(--mol-color-text-secondary)',
          }}
          onClick={() => onChange({ enabled: !enabled, frequency })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onChange({ enabled: !enabled, frequency })
            }
          }}
          tabIndex={0}
          role="switch"
          aria-checked={enabled}
        >
          <div
            className={cm.cn(
              cm.w(4),
              cm.h(4),
              cm.roundedFull,
              'absolute top-1 bg-surface transition-all duration-200',
              enabled ? 'right-1' : 'left-1',
            )}
          ></div>
        </div>
      </div>
    </div>
  )
}

export default RecurringTransactionPanel
export { RecurringTransactionPanel }
