import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Stock-movement activity row — editorial activity-feed grammar.
 *
 * One row per inbound, outbound, transfer, or adjustment event. Shows reason
 * + product + SKU + warehouse on the left, the signed quantity (green for
 * positive, red for negative, muted for zero) and a relative timestamp on the
 * right. Use inside a `divide-y divide-outline-variant` list.
 *
 * Translated from personal-finance/ActivityRow.tsx — same icon-tile +
 * primary-line + meta-line layout, retuned to inventory's signed-quantity
 * convention (positive green / negative red / zero muted) per DESIGN.md
 * "Quantity coloring".
 */

export type MovementKind = 'inbound' | 'outbound' | 'transfer' | 'adjustment'

export interface MovementEntry {
  id: string
  kind: MovementKind
  productName: string
  sku: string
  quantity: number
  warehouse?: string
  reason: string
  occurredAt: string
}

interface MovementRowProps {
  entry: MovementEntry
}

const KIND_META: Record<
  MovementKind,
  { icon: string; bg: string; fg: string; labelKey: string; labelDefault: string }
> = {
  inbound: {
    icon: 'arrow_downward',
    bg: 'var(--color-stock-incoming-bg)',
    fg: 'var(--color-stock-incoming)',
    labelKey: 'movementRow.inbound',
    labelDefault: 'Inbound',
  },
  outbound: {
    icon: 'arrow_upward',
    bg: 'var(--color-stock-out-bg)',
    fg: 'var(--color-stock-out)',
    labelKey: 'movementRow.outbound',
    labelDefault: 'Outbound',
  },
  transfer: {
    icon: 'sync_alt',
    bg: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
    fg: 'var(--color-primary)',
    labelKey: 'movementRow.transfer',
    labelDefault: 'Transfer',
  },
  adjustment: {
    icon: 'tune',
    bg: 'var(--color-stock-reserved-bg)',
    fg: 'var(--color-stock-reserved)',
    labelKey: 'movementRow.adjustment',
    labelDefault: 'Adjustment',
  },
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const diffSec = Math.round((Date.now() - then) / 1000)
  if (diffSec < 60) return `${Math.max(diffSec, 0)}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.round(diffHour / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString()
}

export function MovementRow({ entry }: MovementRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const meta = KIND_META[entry.kind]
  const positive = entry.quantity > 0
  const zero = entry.quantity === 0
  const qtyColor = zero
    ? 'var(--color-stock-reserved)'
    : positive
      ? 'var(--color-stock-in)'
      : 'var(--color-stock-out)'
  const sign = positive ? '+' : ''

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        'transition-colors hover:bg-background-secondary',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0 flex-1')}>
        <span
          className={cm.cn(
            'inline-flex h-9 w-9 rounded-full',
            cm.flex({ align: 'center', justify: 'center' }),
          )}
          style={{ backgroundColor: meta.bg, color: meta.fg }}
          aria-hidden="true"
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon={meta.icon}>
            {meta.icon}
          </span>
        </span>
        <div className={cm.cn('min-w-0 flex-1')}>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'truncate text-on-surface',
            )}
          >
            {entry.productName}
          </p>
          <p className={cm.cn('truncate text-[11px] text-on-surface-variant')}>
            <span className={cm.cn(cm.fontWeight('semibold'))} style={{ color: meta.fg }}>
              {t(meta.labelKey, {}, { defaultValue: meta.labelDefault })}
            </span>
            <span className={cm.cn('px-1.5')}>·</span>
            <span
              className={cm.cn('font-mono tracking-wide')}
              style={{ color: 'var(--color-sku)' }}
            >
              {entry.sku}
            </span>
            {entry.warehouse && (
              <>
                <span className={cm.cn('px-1.5')}>·</span>
                <span>{entry.warehouse}</span>
              </>
            )}
            <span className={cm.cn('px-1.5')}>·</span>
            <span className={cm.cn('italic')}>{entry.reason}</span>
          </p>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', align: 'end', gap: 'xs' }), 'shrink-0')}>
        <span
          className={cm.cn('font-mono text-sm font-bold tabular-nums')}
          style={{ color: qtyColor }}
        >
          {sign}
          {entry.quantity}
        </span>
        <span className={cm.cn('text-[10px] uppercase tracking-wider text-on-surface-variant')}>
          {formatRelative(entry.occurredAt)}
        </span>
      </div>
    </div>
  )
}

export default MovementRow
