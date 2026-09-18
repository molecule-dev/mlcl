import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Restaurant {
  id: string
  name: string
  cuisine: string
  estimated_delivery_min: number
  rating: number
}

interface SearchResult {
  type: 'restaurant' | 'cuisine'
  id: string
  title: string
  subtitle: string
  href: string
}

const FILTERS = ['all', 'restaurant', 'cuisine'] as const
type Filter = (typeof FILTERS)[number]

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(false)

  // Reload server-side when the query changes (debounced).
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const url = query.trim()
      ? `/api/restaurants?q=${encodeURIComponent(query.trim())}`
      : '/api/restaurants'
    const handle = setTimeout(() => {
      http
        .get(url)
        .then((res) => {
          if (!cancelled) setRestaurants(unwrapList<Restaurant>(res))
        })
        .catch(() => {
          /* ignore */
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [http, query])

  const results: SearchResult[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    const restaurantHits: SearchResult[] = restaurants
      .filter((r) => {
        if (!q) return true
        return r.name.toLowerCase().includes(q) || (r.cuisine ?? '').toLowerCase().includes(q)
      })
      .map((r) => ({
        type: 'restaurant' as const,
        id: r.id,
        title: r.name,
        subtitle: t(
          'search.restaurantSubtitle',
          {
            cuisine: r.cuisine ?? '—',
            etaMin: r.estimated_delivery_min ?? 30,
            etaMax: (r.estimated_delivery_min ?? 30) + 10,
          },
          { defaultValue: '{{cuisine}} · {{etaMin}}–{{etaMax}} min' },
        ),
        href: `/restaurant/${r.id}`,
      }))

    // Derive cuisine groupings from the loaded restaurants.
    const cuisineCounts = new Map<string, number>()
    for (const r of restaurants) {
      if (!r.cuisine) continue
      cuisineCounts.set(r.cuisine, (cuisineCounts.get(r.cuisine) ?? 0) + 1)
    }
    const cuisineHits: SearchResult[] = Array.from(cuisineCounts.entries())
      .filter(([cuisine]) => !q || cuisine.toLowerCase().includes(q))
      .map(([cuisine, count]) => ({
        type: 'cuisine' as const,
        id: `c-${cuisine}`,
        title: cuisine.charAt(0).toUpperCase() + cuisine.slice(1),
        subtitle: t(
          'search.cuisineSubtitle',
          { count },
          { defaultValue: '{{count}} places nearby' },
        ),
        href: `/restaurants?cuisine=${encodeURIComponent(cuisine)}`,
      }))

    const merged = [...restaurantHits, ...cuisineHits]
    if (filter === 'all') return merged
    return merged.filter((r) => r.type === filter)
  }, [restaurants, query, filter, t])

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.sp('mb', 4)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('search.eyebrow', {}, { defaultValue: 'Find a place' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('common.search', {}, { defaultValue: 'Search' })}
        </h1>
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('mb', 4),
          'bg-surface rounded-full shadow-sm',
          cm.sp('px', 4),
          cm.sp('py', 3),
        )}
      >
        <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
          search
        </span>
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'search.placeholder',
            {},
            { defaultValue: 'Restaurants, cuisines, dishes…' },
          )}
          className={'flex-1 bg-transparent outline-none'}
          aria-label={t('common.search', {}, { defaultValue: 'Search' })}
          data-testid="search-input"
        />
      </div>

      <div className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('mb', 6))}>
        {FILTERS.map((f) => {
          const isActive = filter === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              data-testid={`search-filter-${f}`}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'rounded-full',
                isActive ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface',
              )}
              aria-pressed={isActive}
            >
              {t(
                `search.filter.${f}`,
                {},
                {
                  defaultValue:
                    f === 'all' ? 'All' : f === 'restaurant' ? 'Restaurants' : 'Cuisines',
                },
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('search.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : results.length === 0 ? (
        <p
          data-testid="search-empty"
          className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}
        >
          {t('search.empty', { query }, { defaultValue: 'No results for "{{query}}".' })}
        </p>
      ) : (
        <ul data-testid="search-results" className={'space-y-2'}>
          {results.map((r) => (
            <li key={r.id}>
              <Link
                to={r.href}
                data-testid={`search-result-${r.type}`}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', gap: 'md' }),
                  'block bg-surface rounded-lg shadow-sm hover:shadow-md transition-shadow',
                )}
              >
                <div className={'flex-1'}>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant uppercase tracking-wide',
                    )}
                  >
                    {t(`search.type.${r.type}`, {}, { defaultValue: r.type })}
                  </p>
                  <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                    {r.title}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{r.subtitle}</p>
                </div>
                <span aria-hidden="true" className="text-on-surface-variant">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
