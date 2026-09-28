/**
 * Destinations — editorial discovery board for places saved or curated.
 * Renders a `<DestinationOrbCard>` grid (full-bleed cover, gradient
 * scrim, accent pill) plus a category filter chip row above. The CTA
 * pulls into the trip planner so a planner can convert a destination
 * into a trip in one click.
 *
 * Real backend: GET /api/destinations returns the editorial catalog
 * (seeded by the 0010 migration). All travelers see the same list.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DestinationOrbCard } from '../components/DestinationOrbCard.js'

interface DestinationRow {
  id: string
  name: string
  region: string | null
  blurb: string | null
  thumbnail: string | null
  pill_label: string | null
  trip_count: number | string
}

function rowToDestination(row: DestinationRow) {
  return {
    id: row.id,
    name: row.name,
    region: row.region ?? '',
    blurb: row.blurb ?? '',
    thumbnail: row.thumbnail ?? `https://picsum.photos/seed/${row.id}/1200/900`,
    pill: row.pill_label ?? undefined,
    trip_count: Number(row.trip_count ?? 0) || undefined,
  }
}

export function Destinations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [active, setActive] = useState<string>('all')
  const [rows, setRows] = useState<DestinationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    http
      .get<DestinationRow[]>('/destinations')
      .then((resp) => {
        if (cancelled) return
        setRows(Array.isArray(resp.data) ? resp.data : [])
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t('destinations.errors.load', {}, { defaultValue: 'Could not load destinations.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const destinations = useMemo(() => rows.map(rowToDestination), [rows])

  const pills = useMemo(() => {
    const set = new Set<string>()
    for (const d of destinations) {
      if (d.pill) set.add(d.pill)
    }
    return ['all', ...Array.from(set)]
  }, [destinations])

  const filtered = active === 'all' ? destinations : destinations.filter((d) => d.pill === active)

  return (
    <div
      className={cm.cn(
        cm.maxW('7xl'),
        cm.sp('px', 8),
        cm.sp('py', 10),
        cm.mxAuto,
        cm.flex({ direction: 'col', gap: 'lg' }),
      )}
    >
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('destinations.eyebrow', {}, { defaultValue: 'Where to next' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 2),
              'leading-tight tracking-tight',
            )}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t('destinations.heading', {}, { defaultValue: 'Saved corners and editor finds.' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 2),
              cm.maxW('2xl'),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'destinations.subheading',
              {},
              {
                defaultValue:
                  'Drop any of these into a new trip in a click \u2014 the day timeline starts itself.',
              },
            )}
          </p>
        </div>
        <Link
          to="/trips/new"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm' }),
            'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-md',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            add_road
          </span>
          {t('destinations.startTripCta', {}, { defaultValue: 'Plan a destination trip' })}
        </Link>
      </header>

      {error ? (
        <div
          role="alert"
          data-testid="destinations-error"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </div>
      ) : null}

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
        {pills.map((pill) => {
          const isActive = active === pill
          return (
            <button
              key={pill}
              type="button"
              data-testid={`destinations-pill-${pill.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              onClick={() => setActive(pill)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest rounded-full transition-colors',
                isActive
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-primary-container/40',
              )}
            >
              {pill === 'all' ? t('status.all', {}, { defaultValue: 'All' }) : pill}
            </button>
          )
        })}
      </div>

      <div
        data-testid="destinations-grid"
        className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5')}
      >
        {filtered.map((d) => (
          <DestinationOrbCard key={d.id} destination={d} />
        ))}
      </div>

      {!loading && filtered.length === 0 ? (
        <div
          data-testid="destinations-empty"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-3xl bg-surface-container-low border border-outline-variant/40',
          )}
        >
          <span
            className="material-symbols-outlined text-4xl text-on-surface-variant"
            aria-hidden="true"
          >
            explore_off
          </span>
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 3),
              'tracking-tight',
            )}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {destinations.length === 0
              ? t('destinations.empty.heading', {}, { defaultValue: 'No destinations yet.' })
              : t(
                  'destinations.emptyFiltered.heading',
                  {},
                  { defaultValue: 'Nothing tagged like that yet.' },
                )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'destinations.empty.body',
              {},
              { defaultValue: 'Switch back to All and the editor finds will reappear.' },
            )}
          </p>
        </div>
      ) : null}
    </div>
  )
}
