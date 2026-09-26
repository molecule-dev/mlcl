import { useCallback, useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EventCard, type EventSummary } from '../components/EventCard.js'

const CATEGORIES = [
  { key: 'all', defaultLabel: 'All', icon: 'apps' },
  { key: 'music', defaultLabel: 'Music', icon: 'music_note' },
  { key: 'tech', defaultLabel: 'Tech', icon: 'memory' },
  { key: 'sports', defaultLabel: 'Sports', icon: 'sports_soccer' },
  { key: 'arts', defaultLabel: 'Arts', icon: 'palette' },
  { key: 'food', defaultLabel: 'Food & drink', icon: 'restaurant' },
  { key: 'business', defaultLabel: 'Business', icon: 'work' },
] as const

interface EventRow {
  id: string
  title: string
  category: string
  start_date: string
  start_time?: string | null
  venue?: string | null
  venue_address?: string | null
  city?: string | null
  min_price?: number | null
  status?: string | null
  tickets_total?: number | null
  tickets_sold?: number | null
}

function rowToSummary(row: EventRow): EventSummary {
  const isFree = (row.min_price ?? 0) === 0
  const sold = Number(row.tickets_sold ?? 0)
  const total = Number(row.tickets_total ?? 0)
  const isSoldOut = total > 0 && sold >= total
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    start_date: row.start_date,
    start_time: row.start_time ?? undefined,
    venue_name: row.venue ?? '',
    city: row.city ?? '',
    min_price: isFree ? undefined : Math.round(Number(row.min_price ?? 0) * 100),
    is_free: isFree,
    is_sold_out: isSoldOut || undefined,
  }
}

export function EventList() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [events, setEvents] = useState<EventSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (category && category !== 'all') params.set('category', category)
      const res = await http.get(`/api/events?${params.toString()}`)
      const rows = (res.data as EventRow[]) ?? []
      setEvents(rows.map(rowToSummary))
    } catch (e) {
      setError((e as Error).message ?? 'Failed to fetch events')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [http, query, category])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const list = useMemo<EventSummary[]>(() => {
    const source = events ?? []
    return source.filter((evt) => {
      if (category !== 'all' && evt.category.toLowerCase() !== category) return false
      if (query && !evt.title.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [events, category, query])

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(8), 'max-w-7xl w-full mx-auto')}
      data-mol-id="page-event-list"
    >
      <header className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), 'flex-wrap gap-4')}>
        <div>
          <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary mb-2')}>
            {t('nav.discover', {}, { defaultValue: 'Discover' })}
          </p>
          <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
            {t('eventList.heading', {}, { defaultValue: 'What’s on near you' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'mt-2 text-on-surface-variant max-w-xl')}>
            {t(
              'eventList.subtitle',
              {},
              {
                defaultValue:
                  'Browse curated picks from concerts to conferences. Filter by mood, vibe, or just see what’s happening this weekend.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setQuery('')
            setCategory('all')
          }}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2.5),
            'rounded-full border border-outline-variant inline-flex items-center gap-2 font-semibold hover:bg-surface-container-low',
          )}
          data-mol-id="reset-filters"
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            tune
          </span>
          {t('eventList.resetFilters', {}, { defaultValue: 'Reset filters' })}
        </button>
      </header>

      {/* Search bar */}
      <div
        className={cm.cn(
          'relative bg-surface rounded-2xl shadow-md border border-outline-variant/40 p-2 flex items-center gap-2 flex-wrap',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            'flex-1 min-w-[260px] px-4 py-2',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-on-surface-variant')}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'eventList.searchPlaceholder',
              {},
              { defaultValue: 'Concerts, conferences, your favorite venue…' },
            )}
            className={cm.cn(
              'w-0 min-w-0 flex-1 bg-transparent border-none focus:outline-none text-sm font-medium',
            )}
          />
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            'px-4 py-2 border-l border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-on-surface-variant')}
            aria-hidden="true"
          >
            place
          </span>
          <span className={cm.cn(cm.textSize('sm'), 'font-semibold')}>
            {t('eventList.location', {}, { defaultValue: 'New York · 25mi' })}
          </span>
        </div>
        <button
          type="button"
          onClick={() => fetchEvents()}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            'rounded-xl text-white font-bold inline-flex items-center gap-2 shadow-md shadow-primary/30 hover:-translate-y-0.5 transition-transform',
          )}
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
          }}
          data-mol-id="search-events"
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            search
          </span>
          {t('common.search', {}, { defaultValue: 'Search' })}
        </button>
      </div>

      {/* Category pills */}
      <div className={cm.cn('flex items-center gap-2 overflow-x-auto pb-1')}>
        {CATEGORIES.map((c) => {
          const active = category === c.key
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap border transition-colors',
                active
                  ? 'text-white border-transparent shadow-md shadow-primary/30'
                  : 'border-outline-variant text-on-surface-variant hover:text-on-surface',
              )}
              style={
                active
                  ? {
                      background:
                        'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    }
                  : undefined
              }
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                {c.icon}
              </span>
              {t(`eventList.category.${c.key}`, {}, { defaultValue: c.defaultLabel })}
            </button>
          )
        })}
      </div>

      {/* Loading / error state */}
      {loading ? (
        <p className={cm.cn(cm.textCenter, cm.sp('py', 8), cm.textMuted)}>
          {t('eventList.loading', {}, { defaultValue: 'Loading events…' })}
        </p>
      ) : null}
      {error && !loading ? (
        <p className={cm.cn(cm.textCenter, cm.sp('py', 4), 'text-error font-bold')} role="alert">
          {t(
            'eventList.errorLoad',
            { msg: error },
            { defaultValue: 'Could not load events. {{msg}}' },
          )}
        </p>
      ) : null}

      {/* Grid */}
      <div
        className={cm.cn(
          cm.grid({ gap: 'md' }),
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        )}
      >
        {list.map((evt) => (
          <EventCard key={evt.id} event={evt} />
        ))}
      </div>

      {!loading && list.length === 0 ? (
        <div className={cm.cn(cm.textCenter, cm.sp('py', 12))}>
          <span
            className={cm.cn('material-symbols-outlined text-5xl text-primary/40')}
            aria-hidden="true"
          >
            event_busy
          </span>
          <p className={cm.cn(cm.sp('mt', 3), cm.textSize('sm'), cm.textMuted)}>
            {t(
              'eventList.empty',
              {},
              { defaultValue: 'No events match those filters yet. Try widening your search.' },
            )}
          </p>
        </div>
      ) : null}
    </div>
  )
}

export default EventList
