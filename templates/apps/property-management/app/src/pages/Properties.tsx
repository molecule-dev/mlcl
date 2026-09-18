import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PropertyListCard, type PropertySummary } from '../components/PropertyListCard.js'

const FILTERS = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'active', defaultLabel: 'Active' },
  { key: 'occupied', defaultLabel: 'Fully occupied' },
  { key: 'vacancies', defaultLabel: 'Has vacancies' },
] as const
type FilterKey = (typeof FILTERS)[number]['key']

export function Properties() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const filter = (searchParams.get('filter') as FilterKey) || 'all'

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/properties?limit=100')
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res)
          ? (res as PropertySummary[])
          : ((res as { data?: PropertySummary[] })?.data ?? [])
        const normalized: PropertySummary[] = list.map((p) => ({
          id: p.id,
          name: p.name ?? 'Untitled',
          address: p.address ?? '',
          unit_count: p.unit_count ?? 0,
          occupied_units: p.occupied_units ?? 0,
          monthly_revenue_cents: p.monthly_revenue_cents ?? 0,
          status: p.status ?? 'active',
          photo_url: p.photo_url ?? null,
        }))
        setProperties(normalized)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const visible = useMemo(() => {
    return properties.filter((p) => {
      if (filter === 'active' && p.status !== 'active') return false
      if (filter === 'occupied' && p.occupied_units < p.unit_count) return false
      if (filter === 'vacancies' && p.occupied_units >= p.unit_count) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !p.address.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [properties, filter, search])

  const totalUnits = properties.reduce((acc, p) => acc + p.unit_count, 0)
  const totalOccupied = properties.reduce((acc, p) => acc + p.occupied_units, 0)
  const occupancyPct = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(6))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('properties.heading', {}, { defaultValue: 'Properties' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'properties.subheading',
              { count: properties.length, units: totalUnits, pct: occupancyPct },
              { defaultValue: '{{count}} buildings · {{units}} units · {{pct}}% occupancy' },
            )}
          </p>
        </div>
        <Link
          to="/properties/new"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            add
          </span>
          {t('properties.addProperty', {}, { defaultValue: 'Add property' })}
        </Link>
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('p', 4),
          'bg-surface-container-lowest rounded-2xl border border-outline-variant/40',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                if (f.key === 'all') next.delete('filter')
                else next.set('filter', f.key)
                setSearchParams(next, { replace: true })
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.roundedFull,
                'transition-colors',
                filter === f.key
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {t(`properties.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
            </button>
          ))}
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'relative')}>
          <span
            className={cm.cn(
              'material-symbols-outlined text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none',
            )}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'properties.searchPlaceholder',
              {},
              { defaultValue: 'Search by name or address' },
            )}
            className={cm.cn(
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.w(64),
              'rounded-full bg-surface border border-outline-variant focus:outline-none focus:ring-2 ring-primary/30',
            )}
          />
        </div>
      </div>

      {loading ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant bg-surface-container-lowest rounded-2xl',
          )}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant',
          )}
          data-testid="properties-empty"
        >
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: '48px' }}
            aria-hidden="true"
          >
            apartment
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
            {properties.length === 0
              ? t('properties.empty.first.title', {}, { defaultValue: 'No properties yet' })
              : t(
                  'properties.empty.title',
                  {},
                  { defaultValue: 'No properties match those filters' },
                )}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {properties.length === 0
              ? t(
                  'properties.empty.first.body',
                  {},
                  {
                    defaultValue:
                      'Add your first building to start tracking units, leases, and rent.',
                  },
                )
              : t(
                  'properties.empty.body',
                  {},
                  { defaultValue: 'Try clearing the search or pick a different filter.' },
                )}
          </p>
          {properties.length === 0 && (
            <Link
              to="/properties/new"
              data-testid="add-first-property"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.sp('mt', 4),
                cm.fontWeight('semibold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'inline-flex bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
              )}
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                add
              </span>
              {t('properties.empty.first.cta', {}, { defaultValue: 'Add property' })}
            </Link>
          )}
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
          {visible.map((p) => (
            <PropertyListCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  )
}
