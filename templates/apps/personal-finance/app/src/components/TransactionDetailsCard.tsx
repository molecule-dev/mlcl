import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'

interface Transaction {
  notes: string
  tags: string[]
  recurring: boolean
}

interface Props {
  transaction: Transaction
}

function TransactionDetailsCard({ transaction }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [recurring, setRecurring] = useState(transaction.recurring ?? false)
  const tags = Array.isArray(transaction?.tags) ? transaction.tags : []
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
      )}
    >
      <div className={cm.stack(10)}>
        <div>
          <div
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              'text-[10px] text-foreground-tertiary uppercase tracking-widest',
            )}
          >
            {t('form.tags', {}, { defaultValue: 'Tags' })}
          </div>
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
            {tags.map((tag: string, i: number) => (
              <span
                key={i}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.roundedFull,
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'py-1.5 bg-surface text-on-surface shadow-sm',
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              'text-[10px] text-foreground-tertiary uppercase tracking-widest',
            )}
          >
            {t('form.notes', {}, { defaultValue: 'Notes' })}
          </div>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed font-body')}>
            {transaction.notes}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 6),
            'bg-surface/50 rounded-2xl',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <span
              className={cm.cn(cm.textPrimary, 'material-symbols-outlined')}
              data-icon="event_repeat"
            >
              event_repeat
            </span>
            <div>
              <div className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t(
                  'transactionDetailsCard.recurringTitle',
                  {},
                  { defaultValue: 'Recurring Transaction' },
                )}
              </div>
              <div className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
                {t(
                  'status.monthly',
                  { frequency: t('common.monthly', {}, { defaultValue: 'Monthly' }) },
                  { defaultValue: 'Scheduled {{frequency}}' },
                )}
              </div>
            </div>
          </div>
          <Switch
            checked={recurring}
            size="md"
            aria-label={t(
              'transactionDetailsCard.recurringTitle',
              {},
              { defaultValue: 'Recurring Transaction' },
            )}
            data-mol-id="transaction-details-recurring-switch"
            onChange={(e) => setRecurring((e.target as HTMLInputElement).checked)}
          />
        </div>
      </div>
    </section>
  )
}

export default TransactionDetailsCard
export { TransactionDetailsCard }
