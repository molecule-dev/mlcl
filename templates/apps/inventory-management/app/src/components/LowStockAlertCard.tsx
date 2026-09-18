import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Low-stock alert card — DESIGN.md "Low Stock Alert Card" component.
 *
 * Border-left amber accent, pale yellow background, mono "current/threshold"
 * stock display, ghost-styled "Restock" button on the right. Severity escalates
 * to red when `quantity === 0` per the Stock Level Badge palette.
 *
 * Translated from online-store/AdminDashboardLowStockAlerts.tsx — same
 * pulse-dot + uppercase action grammar, unified into a per-row card so the
 * Dashboard / Inventory / Notifications screens can reuse a single component.
 */

export interface LowStockAlertItem {
  id: string
  productName: string
  sku: string
  warehouse?: string
  quantity: number
  threshold: number
  href?: string
}

interface LowStockAlertCardProps {
  alert: LowStockAlertItem
  onAction?: (alert: LowStockAlertItem) => void
  actionLabel?: string
  busy?: boolean
}

export function LowStockAlertCard({ alert, onAction, actionLabel, busy }: LowStockAlertCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const isCritical = alert.quantity === 0
  const accent = isCritical ? 'var(--color-stock-out)' : 'var(--color-stock-low)'
  const accentBg = isCritical
    ? 'color-mix(in srgb, var(--color-stock-out-bg) 75%, var(--color-surface))'
    : 'color-mix(in srgb, var(--color-stock-low-bg) 70%, var(--color-surface))'
  const dotPulse = isCritical ? 'animate-pulse' : ''
  const stateLabel = isCritical
    ? t('lowStockAlertCard.outOfStock', {}, { defaultValue: 'Out of stock' })
    : t(
        'lowStockAlertCard.lowStock',
        { quantity: alert.quantity, threshold: alert.threshold },
        { defaultValue: 'Only {{quantity}} of {{threshold}} units left' },
      )

  const href = alert.href ?? `/products/${alert.id}`

  return (
    <article
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        'rounded-lg border-l-4 transition-shadow hover:shadow-sm',
      )}
      style={{ borderLeftColor: accent, backgroundColor: accentBg }}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0 flex-1')}>
        <span
          aria-hidden="true"
          className={cm.cn('inline-block h-2 w-2 rounded-full', dotPulse)}
          style={{ backgroundColor: accent }}
        />
        <div className={cm.cn('min-w-0 flex-1')}>
          <Link
            to={href}
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'block truncate text-on-surface hover:text-primary transition-colors',
            )}
          >
            {alert.productName}
          </Link>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('mt', 1),
              'text-[11px] text-on-surface-variant',
            )}
          >
            <span
              className={cm.cn('font-mono tracking-wide')}
              style={{ color: 'var(--color-sku)' }}
            >
              {alert.sku}
            </span>
            {alert.warehouse && (
              <>
                <span aria-hidden="true">·</span>
                <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                  <span
                    className={cm.cn('material-symbols-outlined text-[12px]')}
                    data-icon="location_on"
                  >
                    location_on
                  </span>
                  {alert.warehouse}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
        <span
          className={cm.cn('font-mono text-[12px] font-bold tabular-nums')}
          style={{ color: accent }}
        >
          {alert.quantity}
          <span className={cm.cn('text-on-surface-variant')}> / {alert.threshold}</span>
        </span>
        <button
          type="button"
          onClick={() => onAction?.(alert)}
          disabled={busy}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            'rounded-md text-[10px] font-black uppercase tracking-[0.16em] transition-colors disabled:opacity-50',
          )}
          style={{ color: accent, backgroundColor: 'transparent' }}
          aria-label={t(
            'lowStockAlertCard.actionAria',
            { name: alert.productName },
            { defaultValue: 'Reorder {{name}}' },
          )}
          title={stateLabel}
        >
          <span className={cm.cn('material-symbols-outlined text-[14px]')} data-icon="redo">
            redo
          </span>
          {actionLabel ?? t('lowStockAlertCard.action', {}, { defaultValue: 'Reorder' })}
        </button>
      </div>
    </article>
  )
}

export default LowStockAlertCard
