import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Stock-level pill badge — DESIGN.md "Stock Level Badge" component.
 *
 * Six semantic variants (in / low / out / overstock / incoming / reserved)
 * driven from the `--color-stock-*` token pairs in `theme.css`. The component
 * also accepts a numeric `quantity` + `threshold` so a Dashboard / Inventory
 * row can hand it the raw stock signal and have the badge derive the variant.
 *
 * Translated from online-store/AdminProductsTable.tsx's getStockBadge() helper.
 */

export type StockStatus = 'in' | 'low' | 'out' | 'overstock' | 'incoming' | 'reserved'

interface StockBadgeProps {
  status?: StockStatus
  quantity?: number
  threshold?: number
  overstockThreshold?: number
  showQuantity?: boolean
  className?: string
}

function deriveStatus(
  quantity: number | undefined,
  threshold: number | undefined,
  overstockThreshold: number | undefined,
): StockStatus {
  if (quantity == null) return 'reserved'
  if (quantity === 0) return 'out'
  if (overstockThreshold != null && quantity >= overstockThreshold) return 'overstock'
  if (threshold != null && quantity <= threshold) return 'low'
  return 'in'
}

export function StockBadge({
  status,
  quantity,
  threshold,
  overstockThreshold,
  showQuantity = false,
  className,
}: StockBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const resolvedStatus = status ?? deriveStatus(quantity, threshold, overstockThreshold)

  const variants: Record<
    StockStatus,
    { bg: string; text: string; labelKey: string; labelDefault: string; dot: string }
  > = {
    in: {
      bg: 'var(--color-stock-in-bg)',
      text: 'var(--color-stock-in)',
      labelKey: 'stockBadge.in',
      labelDefault: 'In Stock',
      dot: 'var(--color-stock-in)',
    },
    low: {
      bg: 'var(--color-stock-low-bg)',
      text: 'var(--color-stock-low)',
      labelKey: 'stockBadge.low',
      labelDefault: 'Low Stock',
      dot: 'var(--color-stock-low)',
    },
    out: {
      bg: 'var(--color-stock-out-bg)',
      text: 'var(--color-stock-out)',
      labelKey: 'stockBadge.out',
      labelDefault: 'Out of Stock',
      dot: 'var(--color-stock-out)',
    },
    overstock: {
      bg: 'var(--color-stock-overstock-bg)',
      text: 'var(--color-stock-overstock)',
      labelKey: 'stockBadge.overstock',
      labelDefault: 'Overstock',
      dot: 'var(--color-stock-overstock)',
    },
    incoming: {
      bg: 'var(--color-stock-incoming-bg)',
      text: 'var(--color-stock-incoming)',
      labelKey: 'stockBadge.incoming',
      labelDefault: 'Incoming',
      dot: 'var(--color-stock-incoming)',
    },
    reserved: {
      bg: 'var(--color-stock-reserved-bg)',
      text: 'var(--color-stock-reserved)',
      labelKey: 'stockBadge.reserved',
      labelDefault: 'Reserved',
      dot: 'var(--color-stock-reserved)',
    },
  }

  const variant = variants[resolvedStatus]
  const label = t(variant.labelKey, {}, { defaultValue: variant.labelDefault })

  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        'inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] tabular-nums',
        className,
      )}
      style={{ backgroundColor: variant.bg, color: variant.text }}
      data-stock-status={resolvedStatus}
    >
      <span
        aria-hidden="true"
        className={cm.cn('inline-block h-1.5 w-1.5 rounded-full')}
        style={{ backgroundColor: variant.dot }}
      />
      {label}
      {showQuantity && quantity != null && (
        <span className={cm.cn('font-mono text-[10px] tracking-normal opacity-70')}>
          {' '}
          · {quantity}
        </span>
      )}
    </span>
  )
}

export default StockBadge
