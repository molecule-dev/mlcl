import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { FlightResultCard, type FlightSummary } from '../components/FlightResultCard.js'

interface RawFlight {
  id: string
  airline: string
  airline_logo?: string
  flight_number: string
  origin_code: string
  origin_city?: string
  destination_code: string
  destination_city?: string
  departure_time: string
  arrival_time: string
  duration_minutes: number
  stops: number
  stop_cities?: string[]
  price: number
  cabin_class?: string
}

const SORT_OPTIONS = [
  { id: 'price', defaultLabel: 'Cheapest' },
  { id: 'duration_minutes', defaultLabel: 'Fastest' },
  { id: 'departure_time', defaultLabel: 'Earliest' },
] as const

const STOP_FILTERS = [
  { id: 'any', defaultLabel: 'Any stops' },
  { id: 'nonstop', defaultLabel: 'Nonstop only' },
  { id: 'one_stop', defaultLabel: 'Up to 1 stop' },
] as const

function decorateFlights(rows: RawFlight[]): FlightSummary[] {
  if (rows.length === 0) return []
  const prices = rows.map((r) => r.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  return rows.map((row) => {
    const ratio = (row.price - min) / range
    const deal: FlightSummary['deal_label'] =
      row.price === min ? 'cheapest' : ratio <= 0.4 ? 'deal' : ratio >= 0.85 ? 'expensive' : null
    return { ...row, deal_label: deal }
  })
}

interface MultiCityLegInput {
  origin: string
  destination: string
  date: string
}

interface MultiCityLegResult {
  leg: MultiCityLegInput
  flights: FlightSummary[]
}

function parseLegsFromParams(params: URLSearchParams): MultiCityLegInput[] {
  const out: MultiCityLegInput[] = []
  for (let i = 1; i <= 6; i++) {
    const raw = params.get(`l${i}`)
    if (!raw) continue
    const [origin, destination, date] = raw.split(',')
    if (origin && destination && date) {
      out.push({ origin: origin.toUpperCase(), destination: destination.toUpperCase(), date })
    }
  }
  return out
}

export function Results() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()

  const isMulti = searchParams.get('multi') === '1'
  const multiLegs = useMemo(
    () => (isMulti ? parseLegsFromParams(searchParams) : []),
    [isMulti, searchParams],
  )

  const origin = searchParams.get('origin') ?? 'JFK'
  const destination = searchParams.get('destination') ?? 'CDG'
  const departureDate = searchParams.get('departure_date') ?? ''
  const passengers = Number(searchParams.get('passengers') ?? '1')

  const [flights, setFlights] = useState<FlightSummary[]>([])
  const [multiResults, setMultiResults] = useState<MultiCityLegResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['id']>('price')
  const [stopFilter, setStopFilter] = useState<(typeof STOP_FILTERS)[number]['id']>('any')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    if (isMulti && multiLegs.length >= 2) {
      http
        .post(`/api/flights/multi-city`, { legs: multiLegs })
        .then((res) => {
          if (cancelled) return
          const data = res.data
          if (!Array.isArray(data)) {
            setMultiResults([])
            return
          }
          const shaped: MultiCityLegResult[] = (
            data as Array<{ leg: MultiCityLegInput; flights: RawFlight[] }>
          ).map((r) => ({ leg: r.leg, flights: decorateFlights(r.flights ?? []) }))
          setMultiResults(shaped)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          console.error('[Results] multi-city search failed:', err)
          setMultiResults([])
          setError(
            t(
              'results.errorMessage',
              {},
              { defaultValue: 'Could not load flights. Please try again.' },
            ),
          )
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => {
        cancelled = true
      }
    }

    const params = new URLSearchParams({ origin, destination, passengers: String(passengers) })
    if (departureDate) params.set('departure_date', departureDate)
    http
      .get(`/api/flights/search?${params.toString()}`)
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray((res as { data?: unknown }).data)
          ? (res as { data: RawFlight[] }).data
          : Array.isArray(res as unknown as RawFlight[])
            ? (res as unknown as RawFlight[])
            : []
        setFlights(decorateFlights(list))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('[Results] flight search failed:', err)
        setFlights([])
        setError(
          t(
            'results.errorMessage',
            {},
            { defaultValue: 'Could not load flights. Please try again.' },
          ),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, isMulti, multiLegs, origin, destination, departureDate, passengers, t])

  const filtered = useMemo(() => {
    const filteredByStops = flights.filter((flight) => {
      if (stopFilter === 'nonstop') return flight.stops === 0
      if (stopFilter === 'one_stop') return flight.stops <= 1
      return true
    })
    const sorted = [...filteredByStops].sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price
      if (sortBy === 'duration_minutes') return a.duration_minutes - b.duration_minutes
      return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime()
    })
    return sorted
  }, [flights, sortBy, stopFilter])

  const cheapest = useMemo(
    () => (flights.length > 0 ? Math.min(...flights.map((f) => f.price)) : 0),
    [flights],
  )

  const multiTotalCheapest = useMemo(() => {
    if (!isMulti) return 0
    let total = 0
    for (const result of multiResults) {
      if (result.flights.length === 0) return 0
      total += Math.min(...result.flights.map((f) => f.price))
    }
    return total
  }, [isMulti, multiResults])

  if (isMulti) {
    return (
      <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
        <section
          className={cm.cn(
            cm.sp('p', 8),
            'relative overflow-hidden bg-gradient-to-br from-primary via-secondary to-primary-container text-white rounded-[2rem] shadow-lg',
          )}
        >
          <div
            className={cm.cn(
              cm.w(64),
              cm.h(64),
              cm.roundedFull,
              'absolute -right-20 -top-20 bg-surface/10 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.w(48),
              cm.h(48),
              cm.roundedFull,
              'absolute -left-12 -bottom-12 bg-accent/30 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'relative z-10',
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            )}
          >
            <div className={'min-w-0'}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-accent',
                )}
              >
                {t('results.multiEyebrow', {}, { defaultValue: 'Multi-city itinerary' })}
              </p>
              <h1
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 2),
                  'leading-[0.95] tracking-tight tabular-nums',
                )}
              >
                {multiLegs.map((l) => l.origin).join(' → ')}
                {multiLegs.length > 0 ? <span className="text-accent"> → </span> : null}
                {multiLegs[multiLegs.length - 1]?.destination ?? ''}
              </h1>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-white/85')}>
                {t(
                  'results.multiSummary',
                  { count: multiLegs.length, passengers },
                  { defaultValue: '{{count}} legs · {{passengers}} traveler' },
                )}
              </p>
            </div>
            <div
              className={cm.cn(
                cm.sp('p', 4),
                'bg-surface/15 backdrop-blur-md rounded-2xl ring-1 ring-white/25 text-right',
              )}
            >
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-accent',
                )}
              >
                {t('results.totalCheapestLabel', {}, { defaultValue: 'Cheapest total' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 1),
                  'tabular-nums leading-none',
                )}
              >
                {multiTotalCheapest > 0 ? `$${multiTotalCheapest.toLocaleString()}` : '—'}
              </p>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.sp('mt', 6), cm.flex({ direction: 'col', gap: 'lg' }))}>
          {error ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
          ) : loading ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
              {t('results.loading', {}, { defaultValue: 'Searching live fares…' })}
            </p>
          ) : multiResults.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
              {t('results.empty', {}, { defaultValue: 'No flights match these filters.' })}
            </p>
          ) : (
            multiResults.map((result, idx) => (
              <div
                key={idx}
                data-testid={`multi-leg-result-${idx}`}
                className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
              >
                <h2
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-[0.25em] text-on-surface-variant',
                  )}
                >
                  {t(
                    'results.multiLegHeading',
                    {
                      n: idx + 1,
                      from: result.leg.origin,
                      to: result.leg.destination,
                      date: result.leg.date,
                    },
                    { defaultValue: 'Leg {{n}} · {{from}} → {{to}} · {{date}}' },
                  )}
                </h2>
                {result.flights.length === 0 ? (
                  <p className={cm.cn(cm.sp('py', 4), 'text-on-surface-variant')}>
                    {t('results.empty', {}, { defaultValue: 'No flights match these filters.' })}
                  </p>
                ) : (
                  result.flights
                    .slice(0, 5)
                    .map((flight) => (
                      <FlightResultCard key={flight.id} flight={flight} passengers={passengers} />
                    ))
                )}
              </div>
            ))
          )}
        </section>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      {/* Route summary card */}
      <section
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden bg-gradient-to-br from-primary via-secondary to-primary-container text-white rounded-[2rem] shadow-lg',
        )}
      >
        <div
          className={cm.cn(
            cm.w(64),
            cm.h(64),
            cm.roundedFull,
            'absolute -right-20 -top-20 bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            cm.w(48),
            cm.h(48),
            cm.roundedFull,
            'absolute -left-12 -bottom-12 bg-accent/30 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'relative z-10',
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          )}
        >
          <div className={'min-w-0'}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-accent',
              )}
            >
              {t('results.eyebrow', {}, { defaultValue: 'Live results' })}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('5xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 2),
                'leading-[0.95] tracking-tight tabular-nums',
              )}
            >
              {origin} <span className="text-accent">→</span> {destination}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-white/85')}>
              {t(
                'results.summary',
                { count: flights.length, passengers },
                { defaultValue: '{{count}} flights · {{passengers}} traveler' },
              )}
              {departureDate
                ? ` · ${new Date(departureDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                : ''}
            </p>
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 4),
              'bg-surface/15 backdrop-blur-md rounded-2xl ring-1 ring-white/25 text-right',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-accent',
              )}
            >
              {t('results.cheapestLabel', {}, { defaultValue: 'Cheapest fare' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 1),
                'tabular-nums leading-none',
              )}
            >
              ${cheapest.toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <section
        className={cm.cn(
          cm.sp('px', 5),
          cm.sp('py', 3),
          cm.sp('mt', 6),
          cm.flex({ align: 'center', gap: 'md', wrap: 'wrap', justify: 'between' }),
          'sticky top-16 z-20 bg-surface/95 backdrop-blur-md rounded-2xl ring-1 ring-outline-variant/40 shadow-sm',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          {STOP_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStopFilter(filter.id)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest rounded-full transition-colors',
                stopFilter === filter.id
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
              aria-pressed={stopFilter === filter.id}
            >
              {t(`results.stopFilter.${filter.id}`, {}, { defaultValue: filter.defaultLabel })}
            </button>
          ))}
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('results.sortLabel', {}, { defaultValue: 'Sort' })}
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as (typeof SORT_OPTIONS)[number]['id'])}
            aria-label={t('results.sortAriaLabel', {}, { defaultValue: 'Sort results by' })}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-surface-container ring-1 ring-outline-variant rounded-full outline-none focus:ring-primary',
            )}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {t(`results.sortOptions.${opt.id}`, {}, { defaultValue: opt.defaultLabel })}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Result list */}
      <section className={cm.cn(cm.sp('mt', 6), cm.flex({ direction: 'col', gap: 'md' }))}>
        {error ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
        ) : loading ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
            {t('results.loading', {}, { defaultValue: 'Searching live fares…' })}
          </p>
        ) : filtered.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
            {t('results.empty', {}, { defaultValue: 'No flights match these filters.' })}
          </p>
        ) : (
          filtered.map((flight) => (
            <FlightResultCard key={flight.id} flight={flight} passengers={passengers} />
          ))
        )}
      </section>
    </div>
  )
}
