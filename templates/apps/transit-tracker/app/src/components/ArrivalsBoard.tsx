import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type Arrival, ArrivalRow } from './ArrivalRow.js'

/**
 * The departures board: sorted arrival rows + a generated-at stamp + a
 * manual refresh control. The parent page owns fetching (and any polling
 * policy); the board is a pure presentation list with loading/empty states.
 */
export function ArrivalsBoard({
  arrivals,
  generatedAt,
  loading,
  onRefresh,
}: {
  arrivals: Arrival[]
  generatedAt: string | null
  loading: boolean
  onRefresh: () => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()

  // The board is manual-refresh, but a departures board whose countdowns
  // freeze looks broken between refreshes. One shared clock tick (5s is
  // plenty for minute-granularity) re-derives each row's remaining time from
  // its absolute `arrivalEpochMs`, so countdowns count down and flip to
  // "due" without re-requesting the feed.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <section data-mol-id="arrivals-board">
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
          cm.sp('mb', 4),
        )}
      >
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-on-surface-variant inline-flex items-center gap-2',
          )}
        >
          <span
            className={'material-symbols-outlined text-base'}
            aria-hidden="true"
            style={{ color: 'var(--color-live)' }}
          >
            circle
          </span>
          {t('arrivals.liveBoard', {}, { defaultValue: 'Live arrivals' })}
        </p>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {generatedAt ? (
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
              {t(
                'arrivals.updatedAt',
                { time: new Date(generatedAt).toLocaleTimeString() },
                { defaultValue: 'Updated {{time}}' },
              )}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            data-mol-id="board-refresh"
            aria-label={t('arrivals.refreshAriaLabel', {}, { defaultValue: 'Refresh arrivals' })}
            className={cm.cn(
              'inline-flex items-center justify-center',
              cm.w(9),
              cm.h(9),
              'rounded-full bg-surface-container ring-1 ring-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors',
              cm.touchTargetCompact,
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-lg', loading ? 'animate-spin' : '')}
              aria-hidden="true"
            >
              refresh
            </span>
          </button>
        </div>
      </div>

      {loading && arrivals.length === 0 ? (
        <p
          data-mol-id="arrivals-loading"
          className={cm.cn(cm.sp('py', 10), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('arrivals.loading', {}, { defaultValue: 'Loading arrivals…' })}
        </p>
      ) : arrivals.length === 0 ? (
        <p
          data-mol-id="arrivals-empty"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 10),
            cm.textCenter,
            'rounded-xl bg-surface-container-low text-on-surface-variant ring-1 ring-outline-variant/40',
          )}
        >
          {t(
            'arrivals.noService',
            {},
            { defaultValue: 'No more service today — check the schedules.' },
          )}
        </p>
      ) : (
        <ul className={cm.flex({ direction: 'col', gap: 'sm' })}>
          {arrivals.map((arrival, index) => (
            <ArrivalRow
              key={`${arrival.lineCode}-${arrival.direction}-${index}`}
              arrival={arrival}
              now={now}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
