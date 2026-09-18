import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning'

export interface TableTileData {
  id: string
  /** Display label (e.g. '7' or 'B-3'). */
  label: string
  /** Maximum seat count. */
  seats: number
  /** Current guest count (0 if empty). */
  guests?: number
  status: TableStatus
  /** Optional server name (assigned waiter). */
  server?: string
  /** Optional ticket time in minutes (active dining duration). */
  ticketMinutes?: number
}

interface TableTileProps {
  table: TableTileData
}

const STATUS_THEME: Record<
  TableStatus,
  {
    border: string
    bg: string
    dot: string
    defaultLabel: string
  }
> = {
  available: {
    border: 'border-success',
    bg: 'bg-success/10',
    dot: 'bg-success',
    defaultLabel: 'Available',
  },
  occupied: {
    border: 'border-primary',
    bg: 'bg-primary/10',
    dot: 'bg-primary',
    defaultLabel: 'Occupied',
  },
  reserved: {
    border: 'border-tertiary',
    bg: 'bg-tertiary/10',
    dot: 'bg-tertiary',
    defaultLabel: 'Reserved',
  },
  cleaning: {
    border: 'border-warning',
    bg: 'bg-warning/10',
    dot: 'bg-warning',
    defaultLabel: 'Cleaning',
  },
}

/**
 * Bespoke floor-plan tile — rounded square, status-color 2px border,
 * 10%-opacity tinted bg, big bold label, top-right seat badge, bottom
 * server line. Active orders show a primary dot in the top-left.
 *
 * Pattern source: KPI accent recipe (rounded-xl + colored border +
 * tinted bg) from POLISHED-PATTERN-CATALOG §2.3, adapted for a square
 * floor-plan tile.
 */
export function TableTile({ table }: TableTileProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const theme = STATUS_THEME[table.status]
  const occupied = table.status === 'occupied' && (table.guests ?? 0) > 0

  return (
    <Link
      to={`/tables/${table.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 4),
        'relative aspect-square min-h-[112px] rounded-xl border-2 transition-all hover:-translate-y-0.5 hover:shadow-md',
        theme.border,
        theme.bg,
      )}
    >
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest',
          )}
        >
          <span className={cm.cn('w-2 h-2 rounded-full', theme.dot)} aria-hidden="true" />
          {t(`tableTile.status.${table.status}`, {}, { defaultValue: theme.defaultLabel })}
        </span>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'tabular-nums text-on-surface-variant',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-xs align-middle')}
            aria-hidden="true"
          >
            group
          </span>{' '}
          {t(
            'tableTile.seats',
            { guests: table.guests ?? 0, seats: table.seats },
            { defaultValue: '{{guests}}/{{seats}}' },
          )}
        </span>
      </div>
      <div className={cm.flex({ align: 'baseline', justify: 'center' })}>
        <span
          className={cm.cn(
            cm.textSize('4xl'),
            'font-extrabold tracking-tight font-display tabular-nums',
          )}
        >
          {table.label}
        </span>
      </div>
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        {table.server ? (
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
            <span
              className={cm.cn('material-symbols-outlined text-xs align-middle')}
              aria-hidden="true"
            >
              badge
            </span>{' '}
            {table.server}
          </span>
        ) : (
          <span aria-hidden="true">&nbsp;</span>
        )}
        {occupied && typeof table.ticketMinutes === 'number' && (
          <span
            className={cm.cn(cm.textSize('xs'), 'font-mono font-bold tabular-nums text-primary')}
          >
            {t(
              'tableTile.ticketTime',
              { minutes: table.ticketMinutes },
              { defaultValue: '{{minutes}}m' },
            )}
          </span>
        )}
      </div>
    </Link>
  )
}
