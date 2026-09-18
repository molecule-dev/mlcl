import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface FavoriteProperty {
  id: string
  property_id: string
  name: string
  city: string
  country: string
  rating: number
  review_count: number
  price_per_night_cents: number
  thumbnail_url?: string | null
  saved_at: string
}

function fmt(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

export function Favorites() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/favorites')
      .then((res) => {
        if (!cancelled) setFavorites(unwrapList<FavoriteProperty>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('favorites.loadError', {}, { defaultValue: 'Failed to load favorites.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function handleRemove(propertyId: string) {
    if (removingId) return
    setRemovingId(propertyId)
    const previous = favorites
    setFavorites((list) => list.filter((f) => f.property_id !== propertyId))
    try {
      await http.delete(`/api/favorites/${propertyId}`)
    } catch (err) {
      console.error('[Favorites] remove failed:', err)
      setFavorites(previous)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('favorites.heading', {}, { defaultValue: 'Saved properties' })}
      </h1>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : favorites.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 20), cm.textCenter, 'text-on-surface-variant')}>
          <p className={cm.cn(cm.textSize('lg'))}>
            {t('favorites.empty', {}, { defaultValue: 'No saved properties yet.' })}
          </p>
          <Link
            to="/search"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.sp('mt', 4),
              cm.fontWeight('semibold'),
              'inline-block bg-primary text-on-primary rounded-full hover:bg-primary-hover',
            )}
          >
            {t('nav.browseStays', {}, { defaultValue: 'Browse stays' })}
          </Link>
        </div>
      ) : (
        <div className={cm.grid({ cols: 3, gap: 'md' })}>
          {favorites.map((f) => (
            <article
              key={f.id}
              className={cm.cn(
                'relative bg-surface rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden',
              )}
            >
              <Link to={`/property/${f.property_id}`} className="block">
                <div className="aspect-[4/3] bg-surface-variant">
                  {f.thumbnail_url ? (
                    <img src={f.thumbnail_url} alt="" className={'h-full w-full object-cover'} />
                  ) : null}
                </div>
                <div className={cm.sp('p', 4)}>
                  <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                    {f.name}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {f.city}, {f.country}
                  </p>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('mt', 1),
                      cm.textSize('sm'),
                    )}
                  >
                    <span aria-hidden="true">★</span>
                    <span>{f.rating.toFixed(1)}</span>
                    <span className="text-on-surface-variant">
                      {t(
                        'favorites.reviewCount',
                        { count: f.review_count },
                        { defaultValue: '({{count}})' },
                      )}
                    </span>
                  </div>
                  <p
                    className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mt', 2))}
                  >
                    {t(
                      'favorites.pricePerNight',
                      { price: fmt(f.price_per_night_cents) },
                      { defaultValue: '{{price}} / night' },
                    )}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                data-testid={`unsave-${f.property_id}`}
                onClick={() => handleRemove(f.property_id)}
                disabled={removingId === f.property_id}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'absolute top-3 right-3 bg-surface/95 rounded-full shadow text-primary hover:bg-surface disabled:opacity-60',
                )}
              >
                {removingId === f.property_id
                  ? t('favorites.removing', {}, { defaultValue: 'Removing…' })
                  : t('favorites.removeCta', {}, { defaultValue: 'Unsave' })}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
