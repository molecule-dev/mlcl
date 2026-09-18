import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Pick list line item — DESIGN.md "Pick List Item" component.
 *
 * Big tap targets for warehouse operators. 24px rounded checkbox, mono SKU,
 * mono bin-location chip, primary tabular quantity, and a subtle teal
 * background tint when checked. Use inside a `divide-y` list within a card.
 *
 * Bespoke signature component for the warehouse-fulfillment app — there is
 * no direct analogue in the polished cluster, so the pattern is built from
 * DESIGN.md spec + the bin-tag/SKU display tokens defined in theme.css.
 */

export interface PickListEntry {
  id: string
  sku: string
  productName: string
  bin: string
  quantityRequested: number
  quantityPicked: number
}

interface PickListItemProps {
  entry: PickListEntry
  onToggle?: (entry: PickListEntry) => void
  disabled?: boolean
}

export function PickListItem({ entry, onToggle, disabled }: PickListItemProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const complete = entry.quantityPicked >= entry.quantityRequested
  const partial = entry.quantityPicked > 0 && !complete
  const accent = complete
    ? 'var(--color-stock-in)'
    : partial
      ? 'var(--color-order-picking)'
      : 'var(--color-priority-standard)'

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('px', 4),
        cm.sp('py', 4),
        'transition-colors',
        complete ? 'bg-secondary/5' : 'hover:bg-background-secondary',
      )}
    >
      <button
        type="button"
        onClick={() => onToggle?.(entry)}
        disabled={disabled}
        aria-pressed={complete}
        aria-label={t(
          'pickListItem.toggleAria',
          { sku: entry.sku },
          { defaultValue: 'Toggle pick for {{sku}}' },
        )}
        className={cm.cn(
          'inline-flex h-7 w-7 shrink-0 rounded-md border-2 transition-colors',
          cm.flex({ align: 'center', justify: 'center' }),
          'disabled:opacity-50',
        )}
        style={{
          borderColor: accent,
          backgroundColor: complete ? accent : 'transparent',
          color: complete ? 'white' : accent,
        }}
      >
        {complete && (
          <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="check">
            check
          </span>
        )}
        {partial && !complete && (
          <span className={cm.cn('h-2.5 w-2.5 rounded-sm')} style={{ backgroundColor: accent }} />
        )}
      </button>

      <div className={cm.cn('min-w-0 flex-1', cm.stack(1))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0 flex-wrap')}>
          <span
            className={cm.cn('font-mono text-xs font-bold tracking-wider')}
            style={{ color: 'var(--color-sku)' }}
          >
            {entry.sku}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'truncate text-on-surface',
            )}
          >
            {entry.productName}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          <span
            className={cm.cn(
              'inline-flex font-mono text-[11px] font-bold tracking-[0.08em] rounded',
              cm.sp('px', 2),
              cm.sp('py', 0),
            )}
            style={{
              backgroundColor: 'var(--color-background-secondary)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[12px]')}
              style={{ color: 'var(--color-zone)' }}
              data-icon="location_on"
            >
              location_on
            </span>
            {entry.bin}
          </span>
          <span className={cm.cn('text-[11px] text-on-surface-variant')}>
            {t(
              'pickListItem.progress',
              { picked: entry.quantityPicked, total: entry.quantityRequested },
              { defaultValue: 'Picked {{picked}} of {{total}}' },
            )}
          </span>
        </div>
      </div>

      <div className={cm.cn('shrink-0 text-right')}>
        <p
          className={cm.cn('text-2xl font-extrabold leading-none tabular-nums')}
          style={{ color: complete ? 'var(--color-stock-in)' : 'var(--color-text)' }}
        >
          {entry.quantityRequested}
        </p>
        <p className={cm.cn('text-[10px] uppercase tracking-wider text-on-surface-variant')}>
          {t('pickListItem.qty', {}, { defaultValue: 'Qty' })}
        </p>
      </div>
    </div>
  )
}

export default PickListItem
