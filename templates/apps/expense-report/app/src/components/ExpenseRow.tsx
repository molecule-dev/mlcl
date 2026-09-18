import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Editorial expense row — category icon chip, merchant + date stack, category
 * pill, amount right-aligned tabular-nums, dashed-border receipt thumbnail.
 *
 * Translated from personal-finance's TransactionRow / AccountRecentTransactions
 * editorial list pattern. DESIGN.md "Expense Row" + "Receipt Thumbnail" specs
 * are honoured (8px radius thumbnail, dashed fallback for missing receipt).
 */
export interface ExpenseRowItem {
  id: string
  merchant: string
  category: string
  date: string
  amountCents: number
  receiptUrl?: string | null
  status?: string
}

interface ExpenseRowProps {
  item: ExpenseRowItem
  onSelect?: (id: string) => void
}

const CATEGORY_ICON: Record<string, string> = {
  meals: 'restaurant',
  travel: 'flight',
  lodging: 'hotel',
  transport: 'directions_car',
  supplies: 'inventory_2',
  software: 'memory',
  entertainment: 'theater_comedy',
  other: 'receipt_long',
}

const formatUsd = (cents: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100)

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export function ExpenseRow({ item, onSelect }: ExpenseRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const icon = CATEGORY_ICON[item.category.toLowerCase()] ?? 'receipt_long'
  const Tag: 'button' | 'div' = onSelect ? 'button' : 'div'

  return (
    <Tag
      data-mol-id={`expense-row-${item.id}`}
      type={onSelect ? 'button' : undefined}
      onClick={onSelect ? () => onSelect(item.id) : undefined}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        'w-full text-left rounded-xl hover:bg-surface-container-low transition-colors',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'h-10 w-10 shrink-0 rounded-lg bg-primary-container text-on-primary-container',
        )}
        aria-hidden="true"
      >
        <span className={cm.cn('material-symbols-outlined text-xl')}>{icon}</span>
      </div>

      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-on-surface truncate',
          )}
        >
          {item.merchant}
        </span>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {formatDate(item.date)} ·{' '}
          {t(
            `expenseRow.category.${item.category.toLowerCase()}`,
            {},
            { defaultValue: item.category },
          )}
        </span>
      </div>

      <div
        className={cm.cn(
          'h-12 w-12 shrink-0 rounded-lg overflow-hidden',
          item.receiptUrl
            ? 'border border-outline-variant'
            : 'border-2 border-dashed border-outline-variant/60 flex items-center justify-center',
        )}
        aria-hidden="true"
      >
        {item.receiptUrl ? (
          <img
            src={item.receiptUrl}
            alt=""
            className={cm.cn('h-full w-full object-cover')}
            loading="lazy"
          />
        ) : (
          <span className={cm.cn('material-symbols-outlined text-base text-on-surface-variant')}>
            receipt_long
          </span>
        )}
      </div>

      <span
        className={cm.cn(
          'text-base font-bold tabular-nums text-on-surface tracking-tight whitespace-nowrap',
        )}
      >
        {formatUsd(item.amountCents)}
      </span>
    </Tag>
  )
}

export default ExpenseRow
