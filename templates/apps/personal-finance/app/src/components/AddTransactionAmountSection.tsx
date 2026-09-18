import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface AmountSectionProps {
  type: string
  onTypeChange: (type: string) => void
  amount: number
  onAmountChange: (amount: number) => void
}

function AddTransactionAmountSection({
  type,
  onTypeChange,
  amount,
  onAmountChange,
}: AmountSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xl' }))}>
      <div
        className={cm.cn(
          cm.flex(),
          cm.sp('p', 1),
          cm.roundedFull,
          'bg-surface-container-low w-fit',
        )}
      >
        <button
          className={cm.cn(
            cm.sp('px', 10),
            cm.sp('py', 3),
            cm.roundedFull,
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'tracking-wide transition-all duration-300',
            type === 'income'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'text-foreground-secondary hover:text-on-surface',
          )}
          type="button"
          onClick={() => onTypeChange('income')}
          aria-pressed={type === 'income'}
        >
          {t('addTransactionAmountSection.income', {}, { defaultValue: 'Income' })}
        </button>
        <button
          className={cm.cn(
            cm.sp('px', 10),
            cm.sp('py', 3),
            cm.roundedFull,
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'tracking-wide transition-all duration-300',
            type === 'expense'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'text-foreground-secondary hover:text-on-surface',
          )}
          type="button"
          onClick={() => onTypeChange('expense')}
          aria-pressed={type === 'expense'}
        >
          {t('addTransactionAmountSection.expense', {}, { defaultValue: 'Expense' })}
        </button>
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'relative')}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'tracking-widest uppercase text-outline',
          )}
        >
          {t('addTransactionAmountSection.label', {}, { defaultValue: 'Transaction Amount' })}
        </span>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), 'group')}>
          <span
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('bold'),
              'font-headline text-outline group-focus-within:text-primary transition-colors',
            )}
          >
            {t('addTransactionAmountSection.currency', {}, { defaultValue: '$' })}
          </span>
          <input
            data-mol-id="add-transaction-amount"
            className={cm.cn(
              cm.sp('p', 0),
              cm.textCenter,
              'text-7xl font-headline font-extrabold text-on-surface bg-transparent border-none focus:ring-0 w-[400px] placeholder:text-surface-container-highest',
            )}
            placeholder={t('addTransactionAmountSection.placeholder', {}, { defaultValue: '0.00' })}
            step={0.01}
            type="number"
            value={amount || ''}
            onChange={(e) => onAmountChange(Number(e.target.value))}
            required
            min={0.01}
          />
        </div>
      </div>
    </div>
  )
}

export default AddTransactionAmountSection
export { AddTransactionAmountSection }
