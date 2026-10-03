import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { unwrapSingle } from '../lib/unwrap.js'

interface FavoriteRow {
  id: string
  restaurant_id: string
  restaurant: {
    id: string
    name: string
    cuisine: string
    rating: number
    review_count: number
    estimated_delivery_min: number
    thumbnail_url: string | null
  } | null
}

interface FavoritesResponse {
  restaurants: FavoriteRow[]
  dishes: unknown[]
}

export function Favorites() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [favorites, setFavorites] = useState<FavoriteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function reload(): Promise<void> {
    return http
      .get('/api/favorites')
      .then((res) => {
        const payload = unwrapSingle<FavoritesResponse>(res)
        setFavorites(payload?.restaurants ?? [])
        setError(null)
      })
      .catch(() =>
        setError(t('favorites.loadError', {}, { defaultValue: 'Failed to load favorites.' })),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function remove(id: string): Promise<void> {
    try {
      await http.delete(`/api/favorites/${id}`)
      reload()
    } catch (_error) {
      // best-effort delete; stale item will disappear on next reload
    }
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('favorites.eyebrow', {}, { defaultValue: 'Saved for later' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('favorites.heading', {}, { defaultValue: 'Favorites' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 1))}>
          {t(
            'favorites.subheading',
            { count: favorites.length },
            { defaultValue: '{{count}} saved restaurants' },
          )}
        </p>
      </header>

      {error ? (
        <LoadErrorBanner message={error} onRetry={reload} data-testid="favorites-error" />
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : favorites.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
          <p data-testid="favorites-empty" className={cm.cn(cm.textSize('base'), cm.textMuted)}>
            {t('favorites.empty', {}, { defaultValue: 'You have no favorite restaurants yet.' })}
          </p>
          <Link
            to="/restaurants"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.sp('mt', 4),
              cm.fontWeight('semibold'),
              'inline-block bg-primary text-on-primary rounded-full hover:bg-primary-hover',
            )}
          >
            {t('favorites.browseCta', {}, { defaultValue: 'Browse restaurants' })}
          </Link>
        </div>
      ) : (
        <ul data-testid="favorites-list" className={'space-y-3'}>
          {favorites.map((f) => {
            const r = f.restaurant
            if (!r) return null
            return (
              <li
                key={f.id}
                data-testid="favorite-row"
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  'bg-surface rounded-xl shadow-sm',
                )}
              >
                <div className={'flex-1 min-w-0'}>
                  <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                    {r.name}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                    {r.cuisine} · ★ {Number(r.rating ?? 0).toFixed(1)} ·{' '}
                    {t(
                      'favorites.eta',
                      { range: r.estimated_delivery_min },
                      { defaultValue: '{{range}} min' },
                    )}
                  </p>
                </div>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <Link
                    to={`/restaurant/${r.id}`}
                    data-testid="favorite-order-cta"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'bg-primary text-on-primary rounded-full hover:bg-primary-hover',
                    )}
                  >
                    {t('favorites.orderCta', {}, { defaultValue: 'Order' })}
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(f.id)}
                    data-testid="favorite-remove"
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'text-error hover:underline',
                    )}
                  >
                    {t('common.remove', {}, { defaultValue: 'Remove' })}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
