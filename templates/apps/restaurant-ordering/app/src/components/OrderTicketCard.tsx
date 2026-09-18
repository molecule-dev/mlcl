import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type OrderStatus =
  'new' | 'preparing' | 'ready' | 'served' | 'cancelled' | 'pending' | 'paid'

export interface OrderTicketItem {
  /** Display label (e.g. 'Margherita Pizza'). */
  name: string
  /** Quantity (1, 2, …). */
  qty: number
  /** Optional per-line modifier note (e.g. 'no onions'). */
  note?: string
}

export interface OrderTicket {
  id: string
  /** Display order number (e.g. 'A-1042'). */
  number: string
  /** Display table label (e.g. 'Table 7' or 'Pickup'). */
  table: string
  /** ISO timestamp the order was placed — drives the elapsed timer. */
  placedAt: string
  /** Optional explicit elapsed minutes (override timer math). */
  elapsedMinutes?: number
  status: OrderStatus
  items: ReadonlyArray<OrderTicketItem>
  /** Optional rush flag — paints a pulsing red badge. */
  rush?: boolean
  /** Optional dollar total in cents. */
  totalCents?: number
}

interface OrderTicketCardProps {
  order: OrderTicket
}

const STATUS_PALETTE: Record<
  OrderStatus,
  { border: string; chip: string; icon: string; defaultLabel: string }
> = {
  new: {
    border: 'border-l-info',
    chip: 'bg-info/15 text-info',
    icon: 'inbox',
    defaultLabel: 'New',
  },
  pending: {
    border: 'border-l-info',
    chip: 'bg-info/15 text-info',
    icon: 'inbox',
    defaultLabel: 'New',
  },
  preparing: {
    border: 'border-l-warning',
    chip: 'bg-warning/15 text-warning',
    icon: 'soup_kitchen',
    defaultLabel: 'Preparing',
  },
  ready: {
    border: 'border-l-success',
    chip: 'bg-success/15 text-success',
    icon: 'restaurant_menu',
    defaultLabel: 'Ready',
  },
  served: {
    border: 'border-l-on-surface-variant',
    chip: 'bg-surface-container text-on-surface-variant',
    icon: 'check_circle',
    defaultLabel: 'Served',
  },
  paid: {
    border: 'border-l-on-surface-variant',
    chip: 'bg-surface-container text-on-surface-variant',
    icon: 'paid',
    defaultLabel: 'Paid',
  },
  cancelled: {
    border: 'border-l-error',
    chip: 'bg-error/15 text-error',
    icon: 'cancel',
    defaultLabel: 'Cancelled',
  },
}

function fmtCents(cents: number) {
  return `$${(Math.abs(cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function elapsed(order: OrderTicket): { minutes: number; tone: string } {
  let m = order.elapsedMinutes
  if (typeof m !== 'number') {
    const ms = Date.now() - new Date(order.placedAt).getTime()
    m = Math.max(0, Math.floor(ms / 60000))
  }
  const tone = m >= 15 ? 'text-error' : m >= 10 ? 'text-warning' : 'text-on-surface-variant'
  return { minutes: m, tone }
}

/**
 * Bespoke kanban order ticket — left-border accent in status color, mono
 * elapsed timer that warns at 10min / criticals at 15min, items list with
 * qty prefix, optional rush badge, optional total.
 *
 * Pattern source: status-pill + accent-border + uppercase eyebrow recipe
 * from POLISHED-PATTERN-CATALOG §2.3 KPI cards. Adapted for restaurant
 * kitchen-display kanban use.
 */
export function OrderTicketCard({ order }: OrderTicketCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const palette = STATUS_PALETTE[order.status]
  const { minutes, tone } = elapsed(order)

  return (
    <Link
      to={`/orders/${order.id}`}
      className={cm.cn(
        cm.sp('p', 4),
        cm.flex({ direction: 'col', gap: 'sm' }),
        'block bg-surface-container-lowest rounded-xl border-l-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
        palette.border,
      )}
    >
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <div className={cm.flex({ direction: 'col' })}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {order.table}
          </span>
          <span className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight font-display')}>
            {t('orderTicketCard.number', { number: order.number }, { defaultValue: '#{{number}}' })}
          </span>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'xs' })}>
          {order.rush && (
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'uppercase tracking-widest bg-error text-on-error animate-pulse',
              )}
            >
              {t('orderTicketCard.rush', {}, { defaultValue: 'Rush' })}
            </span>
          )}
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'uppercase tracking-widest',
              palette.chip,
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
              {palette.icon}
            </span>
            {t(
              `orderTicketCard.status.${order.status}`,
              {},
              { defaultValue: palette.defaultLabel },
            )}
          </span>
        </div>
      </div>

      <ul className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
        {order.items.slice(0, 4).map((item, i) => (
          <li key={i} className={cm.flex({ align: 'start', gap: 'sm' })}>
            <span className={cm.cn(cm.fontWeight('bold'), 'text-primary tabular-nums')}>
              {item.qty}×
            </span>
            <div className={cm.flex({ direction: 'col' })}>
              <span className={cm.fontWeight('medium')}>{item.name}</span>
              {item.note && (
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}>
                  {item.note}
                </span>
              )}
            </div>
          </li>
        ))}
        {order.items.length > 4 && (
          <li className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'orderTicketCard.moreItems',
              { count: order.items.length - 4 },
              { defaultValue: '+{{count}} more' },
            )}
          </li>
        )}
      </ul>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('pt', 2),
          'border-t border-outline-variant/40',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'font-mono tabular-nums',
            tone,
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-xs align-middle')}
            aria-hidden="true"
          >
            timer
          </span>{' '}
          {t('common.minutesMin', { minutes }, { defaultValue: '{{minutes}} min' })}
        </span>
        {typeof order.totalCents === 'number' && (
          <span className={cm.cn(cm.textSize('sm'), 'font-extrabold tabular-nums')}>
            {fmtCents(order.totalCents)}
          </span>
        )}
      </div>
    </Link>
  )
}
