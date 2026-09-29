import { useState } from 'react'

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
 * the leg ladder — each leg a line badge with the line's name, board→alight
 * and its ride time, connected by transfer chips. Every leg expands into its
 * station progression (the design's "turnout manifest"): the ordered stop
 * walk from board to alight, plus the pace/door-clearance notes riders need
 * before boarding.
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
  const [openLegs, setOpenLegs] = useState<Set<number>>(() => new Set())
  const strategyLabel = STRATEGY_LABELS[option.strategy] ?? option.strategy

  const toggleLeg = (index: number): void => {
    setOpenLegs((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

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
        {option.legs.map((leg, index) => {
          const open = openLegs.has(index)
          return (
            <li
              key={`${leg.line.code}-${index}`}
              className={cm.flex({ direction: 'col', gap: 'xs' })}
            >
              <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
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
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                      cm.sp('mr', 2),
                    )}
                  >
                    {leg.line.name ?? leg.line.code}
                  </span>
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
                  className={cm.cn(
                    cm.textSize('xs'),
                    'ml-auto text-on-surface-variant tabular-nums',
                  )}
                >
                  {formatDuration(leg.ride_seconds)}
                </span>
                {leg.intermediate_stops.length > 0 ? (
                  <button
                    type="button"
                    data-mol-id={`leg-progression-${index}`}
                    onClick={() => toggleLeg(index)}
                    aria-expanded={open}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1.5),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'inline-flex items-center gap-1 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors',
                    )}
                  >
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">
                      linear_scale
                    </span>
                    {t('itinerary.progressionToggle', {}, { defaultValue: 'Station progression' })}
                  </button>
                ) : null}
              </div>

              {open && leg.intermediate_stops.length > 0 ? (
                <div
                  data-mol-id={`leg-progression-panel-${index}`}
                  className={cm.cn(
                    cm.sp('p', 4),
                    'bg-surface-container-low rounded-xl ring-1 ring-outline-variant/40',
                  )}
                >
                  <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(
                        'itinerary.progressionHeading',
                        {},
                        { defaultValue: 'Station progression & turnout manifest' },
                      )}
                    </p>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'inline-flex items-center gap-1 uppercase tracking-widest',
                      )}
                      style={{ color: 'var(--color-live)' }}
                    >
                      <span
                        className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull)}
                        style={{ backgroundColor: 'var(--color-live)' }}
                        aria-hidden="true"
                      />
                      {t('itinerary.progressionLive', {}, { defaultValue: 'Live telemetry' })}
                    </span>
                  </div>
                  <ol className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('mt', 3))}>
                    {[leg.board_stop, ...leg.intermediate_stops, leg.alight_stop].map(
                      (stop, stopIndex, all) => (
                        <li
                          key={stop.code}
                          data-mol-id={`leg-progression-stop-${stop.code}`}
                          className={cm.flex({ align: 'center', gap: 'sm' })}
                        >
                          <span
                            className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'shrink-0')}
                            style={{
                              backgroundColor:
                                stopIndex === 0 || stopIndex === all.length - 1
                                  ? leg.line.color
                                  : 'var(--color-outline-variant)',
                            }}
                            aria-hidden="true"
                          />
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              stopIndex === 0 || stopIndex === all.length - 1
                                ? cm.fontWeight('bold')
                                : 'text-on-surface-variant',
                            )}
                          >
                            {stop.name}
                          </span>
                          {stopIndex === 0 ? (
                            <span
                              className={cm.cn(
                                cm.textSize('xs'),
                                'text-on-surface-variant tabular-nums',
                              )}
                            >
                              {t('itinerary.boardHere', {}, { defaultValue: 'board' })}
                            </span>
                          ) : stopIndex === all.length - 1 ? (
                            <span
                              className={cm.cn(
                                cm.textSize('xs'),
                                'text-on-surface-variant tabular-nums',
                              )}
                            >
                              {t('itinerary.alightHere', {}, { defaultValue: 'alight' })}
                            </span>
                          ) : null}
                        </li>
                      ),
                    )}
                  </ol>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mt', 3),
                      'text-on-surface-variant leading-relaxed',
                    )}
                  >
                    {t(
                      'itinerary.progressionNote',
                      { line: leg.line.name ?? leg.line.code },
                      {
                        defaultValue:
                          'Times along {{line}} are computed from the published schedule clock — the same one the boards count down against.',
                      },
                    )}
                  </p>
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
    </article>
  )
}
