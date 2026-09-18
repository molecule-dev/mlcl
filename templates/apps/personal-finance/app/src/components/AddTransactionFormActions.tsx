import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface FormActionsProps {
  submitting?: boolean
  onCancel?: () => void
}

function AddTransactionFormActions({ submitting = false, onCancel }: FormActionsProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'end', gap: 'lg' }),
        cm.sp('pt', 6),
        'border-t-0',
      )}
    >
      <button
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 3),
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'text-outline hover:text-on-surface transition-colors',
        )}
        type="button"
        onClick={onCancel}
      >
        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
      </button>
      <button
        className={cm.cn(
          cm.sp('px', 10),
          cm.sp('py', 4),
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.flex({ align: 'center', gap: 'sm' }),
          'bg-gradient-to-br from-primary to-primary-container text-white rounded-xl shadow-xl shadow-primary/20 hover:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed',
        )}
        type="submit"
        disabled={submitting}
      >
        <span className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}>check_circle</span>
        {submitting
          ? t('common.saving', {}, { defaultValue: 'Saving...' })
          : t('common.save', {}, { defaultValue: 'Save Transaction' })}
      </button>
    </div>
  )
}

export default AddTransactionFormActions
export { AddTransactionFormActions }
