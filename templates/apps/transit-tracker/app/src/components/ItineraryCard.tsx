import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatClockTime, formatDuration } from '../lib/format.js'
import { LineBadge, type LineBadgeLine } from './LineBadge.js'

export interface ItineraryLeg {
  line: LineBadgeLine
  direction: number
  board_stop: { code: string; name: string }
  alight_stop: { code: string; name: string }
  intermediate_stops: Array<{ code: string; name: string }>
  ride_seconds: number
}

export interface ItineraryOption {
  strategy: string
  transfers: number
  ride_seconds: number
  wait_seconds: number
  total_seconds: number
  depart_at: string
  arrive_at: string
  legs: ItineraryLeg[]
}

const STRATEGY_LABELS: Record<string, string> = {
  fastest: 'Fastest',
  'fewest-transfers': 'Fewest transfers',
  direct: 'Direct',
}

/**
 * One suggested itinerary: headline (total, depart→arrive, transfers), then
 * the leg ladder — each leg a line badge with board→alight and its ride
 * time, connected by transfer chips.
 */
export function ItineraryCard({
  option,
  onLegLineClick,
}: {
  option: ItineraryOption
  onLegLineClick?: (lineCode: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const strategyLabel = STRATEGY_LABELS[option.strategy] ?? option.strategy

  return (
    <article
      data-mol-id={`itinerary-${option.strategy}`}
      className={cm.cn(
        cm.sp('p', 5),
        'bg-surface rounded-2xl ring-1 ring-outline-variant/40 shadow-sm',
      )}
    >
      <header className={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t(`itinerary.strategy.${option.strategy}`, {}, { defaultValue: strategyLabel })}
          </p>
          <p
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'tabular-nums leading-tight',
            )}
          >
            {formatDuration(option.total_seconds)}
            <span
              className={cm.cn(
                cm.textSize('base'),
                cm.fontWeight('medium'),
                ' text-on-surface-variant',
              )}
            >
              {' '}
              ·{' '}
              {t(
                'itinerary.transfers',
                { count: option.transfers },
                { defaultValue: '{{count}} transfers' },
              )}
            </span>
          </p>
        </div>
        <div className={cm.textRight}>
          <p className={cm.cn(cm.textSize('sm'), 'tabular-nums font-semibold')}>
            {formatClockTime(new Date(option.depart_at).getTime())} →{' '}
            {formatClockTime(new Date(option.arrive_at).getTime())}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'itinerary.rideWait',
              {
                ride: formatDuration(option.ride_seconds),
                wait: formatDuration(option.wait_seconds),
              },
              { defaultValue: '{{ride}} riding · {{wait}} waiting' },
            )}
          </p>
        </div>
      </header>

      <ol className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mt', 4))}>
        {option.legs.map((leg, index) => (
          <li
            key={`${leg.line.code}-${index}`}
            className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}
          >
            <button
              type="button"
              data-mol-id={`leg-line-${leg.line.code}`}
              onClick={() => onLegLineClick?.(leg.line.code)}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label={t(
                'itinerary.viewLineAriaLabel',
                { line: leg.line.code },
                { defaultValue: 'View line {{line}}' },
              )}
            >
              <LineBadge line={leg.line} />
            </button>
            <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
              <span className={cm.fontWeight('semibold')}>{leg.board_stop.name}</span>
              <span aria-hidden="true"> → </span>
              <span className={cm.fontWeight('semibold')}>{leg.alight_stop.name}</span>
              {leg.intermediate_stops.length > 0 ? (
                <span className={cm.cn(cm.textSize('xs'), ' text-on-surface-variant')}>
                  {' '}
                  ·{' '}
                  {t(
                    'itinerary.viaStops',
                    { count: leg.intermediate_stops.length },
                    { defaultValue: '{{count}} stops in between' },
                  )}
                </span>
              ) : null}
            </span>
            <span
              className={cm.cn(cm.textSize('xs'), 'ml-auto text-on-surface-variant tabular-nums')}
            >
              {formatDuration(leg.ride_seconds)}
            </span>
          </li>
        ))}
      </ol>
    </article>
  )
}
