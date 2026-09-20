import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LineBadge, type LineBadgeLine } from './LineBadge.js'

export interface StopSummary {
  code: string
  name: string
  hub?: boolean
  lines?: LineBadgeLine[]
}

/**
 * Stop list card used by Nearby, SavedStops, and pickers: name + code chip
 * (+ hub chip) + the lines serving it, linking through to the stop's live
 * board.
 */
export function StopListItem({ stop }: { stop: StopSummary }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <li>
      <Link
        to={`/stops/${stop.code}`}
        data-mol-id={`stop-item-${stop.code}`}
        className={cm.cn(
          'block',
          cm.sp('px', 4),
          cm.sp('py', 3),
          'bg-surface rounded-xl ring-1 ring-outline-variant/40 hover:ring-primary/50 hover:bg-surface-hover transition-colors',
        )}
      >
        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={'material-symbols-outlined text-on-surface-variant'}
              aria-hidden="true"
            >
              {stop.hub ? 'transfer_within_a_station' : 'directions_bus'}
            </span>
            <div>
              <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{stop.name}</p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                {stop.code}
              </p>
            </div>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            {stop.hub ? (
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest rounded-full px-2.5 py-0.5',
                )}
                style={{ backgroundColor: 'var(--color-hub-light)', color: 'var(--color-hub)' }}
              >
                {t('stop.hubChip', {}, { defaultValue: 'Interchange' })}
              </span>
            ) : null}
            {stop.lines && stop.lines.length > 0
              ? stop.lines.map((line) => <LineBadge key={line.code} line={line} size="sm" />)
              : null}
          </div>
        </div>
      </Link>
    </li>
  )
}
