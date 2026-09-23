import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PropertyListingCard } from '../components/PropertyListingCard.js'
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

export function Favorites() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/favorites')
      .then((res) => {
        if (cancelled) return
        const raw = unwrapList<FavoriteProperty>(res)
        setFavorites(
          raw.map((f) => ({
            ...f,
            rating: Number(f.rating ?? 0),
            review_count: Number(f.review_count ?? 0),
            price_per_night_cents: Number(f.price_per_night_cents ?? 0),
          })),
        )
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

  const visible = favorites.filter((f) => !removed.has(f.property_id))

  const toggleBookmark = async (propertyId: string) => {
    const wasRemoved = removed.has(propertyId)
    setRemoved((prev) => {
      const next = new Set(prev)
      if (next.has(propertyId)) next.delete(propertyId)
      else next.add(propertyId)
      return next
    })
    try {
      if (wasRemoved) await http.post(`/api/favorites/${propertyId}`, {})
      else await http.delete(`/api/favorites/${propertyId}`)
      track({
        name: wasRemoved ? 'favorite.added' : 'favorite.removed',
        properties: { property_id: propertyId },
      })
    } catch (error) {
      logError('favorites.toggle', error)
      setRemoved((prev) => {
        const next = new Set(prev)
        if (wasRemoved) next.add(propertyId)
        else next.delete(propertyId)
        return next
      })
    }
  }

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('favorites.eyebrow', {}, { defaultValue: 'Saved for later' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 2),
              'leading-tight tracking-tight',
            )}
            style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
          >
            {t('favorites.heading', {}, { defaultValue: 'Saved properties' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'favorites.subheading',
              { count: visible.length },
              {
                defaultValue: '{{count}} saved · auto-priced for your travel dates when you wander',
              },
            )}
          </p>
        </div>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cm.cn('aspect-[4/3] rounded-2xl bg-surface-container animate-pulse')}
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 20),
            cm.textCenter,
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          )}
        >
          <span
            className="material-symbols-outlined text-6xl text-on-surface-variant"
            aria-hidden="true"
          >
            favorite
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('favorites.empty', {}, { defaultValue: 'No saved properties yet.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-sm')}>
            {t(
              'favorites.emptyHint',
              {},
              {
                defaultValue:
                  'Tap the heart icon on any stay to save it for later — perfect for weekend daydreams.',
              },
            )}
          </p>
          <Link
            to="/search"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'inline-block bg-primary text-on-primary rounded-full hover:bg-primary-container transition-colors',
            )}
          >
            {t('nav.browseStays', {}, { defaultValue: 'Browse stays' })}
          </Link>
        </div>
      ) : (
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}>
          {visible.map((f) => (
            <PropertyListingCard
              key={f.id}
              property={{
                id: f.property_id,
                name: f.name,
                city: f.city,
                country: f.country,
                rating: f.rating,
                review_count: f.review_count,
                price_per_night_cents: f.price_per_night_cents,
                thumbnail_url: f.thumbnail_url,
              }}
              bookmarked
              onToggleBookmark={toggleBookmark}
            />
          ))}
        </div>
      )}
    </div>
  )
}
