import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ItineraryCard, type ItineraryOption } from '../components/ItineraryCard.js'
import type { StopSummary } from '../components/StopListItem.js'
import { StopPicker } from '../components/StopPicker.js'

interface PlanResponse {
  origin: { code: string; name: string }
  destination: { code: string; name: string }
  options: ItineraryOption[]
}

/**
 * Trip planner: origin stop → destination stop → up to three ranked
 * itineraries (fastest / fewest transfers / direct), clock-anchored to the
 * same schedule the boards simulate against (computed server-side — see
 * api/src/lib/trip-planner.ts for the algorithm).
 */
export function TripPlanner() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [stops, setStops] = useState<StopSummary[]>([])
  const [stopsError, setStopsError] = useState(false)
  const [stopsNonce, setStopsNonce] = useState(0)
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [options, setOptions] = useState<ItineraryOption[]>([])
  const [planning, setPlanning] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setStopsError(false)
    http
      .get('/api/network/stops')
      .then((res) => {
        if (cancelled) return
        const data = (res as { data?: unknown }).data ?? res
        if (Array.isArray(data)) setStops(data as StopSummary[])
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('[TripPlanner] stop list failed:', err)
        setStopsError(true)
      })
    return () => {
      cancelled = true
    }
  }, [http, stopsNonce])

  const plan = async (): Promise<void> => {
    if (!origin || !destination || origin === destination) return
    setPlanning(true)
    setError(null)
    try {
      const res = await http.post('/api/trips/plan', {
        origin,
        destination,
      })
      const data = ((res as { data?: unknown }).data ?? res) as PlanResponse
      setOptions(Array.isArray(data.options) ? data.options : [])
      setSearched(true)
      void track({
        name: 'trip.planned',
        properties: { origin, destination, options: data.options?.length ?? 0 },
      })
    } catch (err) {
      console.error('[TripPlanner] plan failed:', err)
      setOptions([])
      setSearched(true)
      setError(
        t('tripPlanner.error', {}, { defaultValue: 'Could not plan this trip. Please try again.' }),
      )
    } finally {
      setPlanning(false)
    }
  }

  const swap = (): void => {
    setOrigin(destination)
    setDestination(origin)
  }

  return (
    <div className={cm.cn(cm.maxW('3xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {t('tripPlanner.eyebrow', {}, { defaultValue: 'Trip planner' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            'leading-tight tracking-tight',
          )}
        >
          {t('tripPlanner.title', {}, { defaultValue: 'Plan across lines' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'tripPlanner.subtitle',
            {},
            {
              defaultValue:
                'Fastest, fewest transfers, and direct options — with real departure times.',
            },
          )}
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void plan()
        }}
        data-mol-id="trip-planner-form"
        className={cm.cn(
          cm.sp('p', 5),
          'bg-surface rounded-2xl ring-1 ring-outline-variant/40 shadow-sm',
          cm.flex({ direction: 'col', gap: 'md' }),
        )}
      >
        <StopPicker
          label={t('tripPlanner.originLabel', {}, { defaultValue: 'From' })}
          value={origin}
          onChange={setOrigin}
          stops={stops}
          dataMolId="trip-origin-picker"
        />
        <div className={cm.flex({ align: 'center', justify: 'center' })}>
          <button
            type="button"
            onClick={swap}
            data-mol-id="trip-swap"
            aria-label={t(
              'tripPlanner.swapAriaLabel',
              {},
              { defaultValue: 'Swap origin and destination' },
            )}
            className={cm.cn(
              'inline-flex items-center justify-center',
              cm.w(9),
              cm.h(9),
              cm.touchTargetCompact,
              'rounded-full bg-surface-container ring-1 ring-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors',
            )}
          >
            <span className={'material-symbols-outlined text-lg'} aria-hidden="true">
              swap_vert
            </span>
          </button>
        </div>
        {stopsError ? (
          <p className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-error')}>
            {t('tripPlanner.stopsError', {}, { defaultValue: 'Could not load the stop list.' })}{' '}
            <button
              type="button"
              onClick={() => setStopsNonce((n) => n + 1)}
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
            >
              {t('common.retry', {}, { defaultValue: 'Retry' })}
            </button>
          </p>
        ) : null}
        <StopPicker
          label={t('tripPlanner.destinationLabel', {}, { defaultValue: 'To' })}
          value={destination}
          onChange={setDestination}
          stops={stops}
          dataMolId="trip-destination-picker"
        />
        <button
          type="submit"
          disabled={!origin || !destination || origin === destination || planning}
          data-mol-id="trip-plan-submit"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
            'rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-lg disabled:opacity-60',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            route
          </span>
          {planning
            ? t('tripPlanner.planning', {}, { defaultValue: 'Planning…' })
            : t('tripPlanner.submit', {}, { defaultValue: 'Find trips' })}
        </button>
      </form>

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.sp('mt', 8))}>
        {error ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-error')}>{error}</p>
        ) : planning && !searched ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('tripPlanner.planning', {}, { defaultValue: 'Planning…' })}
          </p>
        ) : searched && options.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 10),
              cm.textCenter,
              'rounded-xl bg-surface-container-low text-on-surface-variant ring-1 ring-outline-variant/40',
            )}
          >
            {t(
              'tripPlanner.noOptions',
              {},
              {
                defaultValue: 'No itinerary found for this pair today — try a nearby interchange.',
              },
            )}
          </p>
        ) : (
          options.map((option) => (
            <ItineraryCard
              key={option.strategy}
              option={option}
              onLegLineClick={(lineCode) => void navigate(`/lines/${encodeURIComponent(lineCode)}`)}
            />
          ))
        )}
      </section>
    </div>
  )
}
