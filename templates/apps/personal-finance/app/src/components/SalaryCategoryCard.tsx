import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SalaryCategoryCardProps {
  id: string
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

function SalaryCategoryCard({ id, onEdit, onDelete }: SalaryCategoryCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl group hover:shadow-2xl hover:shadow-on-surface/5 transition-all relative overflow-hidden',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
        <div className={cm.cn(cm.sp('p', 3), cm.textPrimary, 'rounded-xl bg-primary/10')}>
          <span
            className={'material-symbols-outlined'}
            data-icon="payments"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            payments
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ gap: 'xs' }),
            'opacity-0 group-hover:opacity-100 transition-opacity',
          )}
        >
          <button
            aria-label={t('common.edit', {}, { defaultValue: 'Edit' })}
            onClick={() => onEdit?.(id)}
            className={cm.cn(
              cm.sp('p', 2),
              'hover:bg-surface-container rounded-lg text-foreground-tertiary hover:text-primary transition-colors',
            )}
          >
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              data-icon="edit"
            >
              edit
            </span>
          </button>
          <button
            aria-label={t('common.delete', {}, { defaultValue: 'Delete' })}
            onClick={() => onDelete?.(id)}
            className={cm.cn(
              cm.sp('p', 2),
              'hover:bg-surface-container rounded-lg text-foreground-tertiary hover:text-tertiary transition-colors',
            )}
          >
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              data-icon="delete"
            >
              delete
            </span>
          </button>
        </div>
      </div>
      <h3
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.textSize('lg'),
          cm.sp('mb', 1),
          'font-headline text-on-surface-variant group-hover:text-primary transition-colors',
        )}
      >
        {t('salaryCategoryCard.title', {}, { defaultValue: 'Salary' })}
      </h3>
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'baseline' }))}>
        <span className={cm.cn('text-[11px] text-foreground-tertiary uppercase tracking-tighter')}>
          {t(
            'salaryCategoryCard.transactionCount',
            { count: 2 },
            { defaultValue: '{{count}} Transactions' },
          )}
        </span>
        <span className={cm.cn(cm.textSize('3xl'), 'font-headline font-extrabold tracking-tight')}>
          {t('salaryCategoryCard.total', { amount: '+$8,500.00' }, { defaultValue: '{{amount}}' })}
        </span>
      </div>
    </div>
  )
}

export default SalaryCategoryCard
export { SalaryCategoryCard }
