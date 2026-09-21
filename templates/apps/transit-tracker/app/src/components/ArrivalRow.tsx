import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatClockTime, formatCountdown } from '../lib/format.js'
import { LineBadge, type LineBadgeLine } from './LineBadge.js'

export interface Arrival {
  lineCode: string
  direction: number
  destinationStop: string
  destinationName: string
  arrivalEpochMs: number
  secondsUntil: number
  line: LineBadgeLine
}

/**
 * One departures-board row: route badge · destination · countdown + clock
 * time · a walking placeholder. The walking distance is a PLACEHOLDER by
 * design — the fictional network has no user geolocation; a real deployment
 * would fill it from the device position.
 *
 * The countdown is derived from the arrival's absolute `arrivalEpochMs`
 * against the board's shared `now` tick (not the request-time snapshot
 * `arrival.secondsUntil`), so it keeps counting between refreshes and flips
 * to "due" on its own. The snapshot remains the fallback if the epoch is
 * missing.
 */
export function ArrivalRow({
  arrival,
  now = Date.now(),
}: {
  arrival: Arrival
  /** Shared board clock (ms). Omit for a static snapshot (e.g. the landing
   * preview) — the countdown then holds its mount-time value. */
  now?: number
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const secondsUntil =
    Number.isFinite(arrival.arrivalEpochMs) && arrival.arrivalEpochMs > 0
      ? Math.max(0, Math.round((arrival.arrivalEpochMs - now) / 1000))
      : arrival.secondsUntil
  const isDue = secondsUntil < 60
  return (
    <li
      data-mol-id={`arrival-${arrival.lineCode}-${arrival.direction}`}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        'bg-surface-container-low rounded-xl ring-1 ring-outline-variant/40',
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <LineBadge line={arrival.line} />
        <div>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {arrival.destinationName}
          </p>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant inline-flex items-center gap-1',
            )}
          >
            <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
              directions_walk
            </span>
            {t('arrivals.walkPlaceholder', {}, { defaultValue: 'Walk time unavailable' })}
          </p>
        </div>
      </div>
      <div className={cm.flex({ align: 'end', gap: 'md' })}>
        <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant tabular-nums')}>
          {formatClockTime(arrival.arrivalEpochMs)}
        </span>
        <span
          className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tabular-nums leading-none')}
          style={isDue ? { color: 'var(--color-due)' } : undefined}
          data-mol-id={`countdown-${arrival.lineCode}-${arrival.direction}`}
        >
          {formatCountdown(secondsUntil)}
        </span>
      </div>
    </li>
  )
}
