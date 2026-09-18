import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Props {
  onEdit: () => void
  onDelete: () => void
}

function TransactionActionButtons({ onEdit, onDelete }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }))}>
      <button
        onClick={onEdit}
        className={cm.cn(
          cm.w('full'),
          cm.sp('py', 5),
          cm.sp('px', 8),
          cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
          cm.fontWeight('bold'),
          cm.textPrimary,
          'bg-surface-container-high font-manrope rounded-2xl transition-all hover:bg-primary hover:text-white active:scale-[0.98]',
        )}
      >
        <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>edit_note</span>
        {t('transactionActionButtons.edit', {}, { defaultValue: 'Edit Transaction' })}
      </button>
      <button
        onClick={onDelete}
        className={cm.cn(
          cm.w('full'),
          cm.sp('py', 4),
          cm.sp('px', 8),
          cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
          cm.fontWeight('bold'),
          'bg-transparent text-tertiary font-manrope rounded-2xl hover:bg-tertiary-fixed-dim/20 transition-all',
        )}
      >
        <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>delete</span>
        {t('transactionActionButtons.delete', {}, { defaultValue: 'Delete Transaction' })}
      </button>
    </div>
  )
}

export default TransactionActionButtons
export { TransactionActionButtons }
