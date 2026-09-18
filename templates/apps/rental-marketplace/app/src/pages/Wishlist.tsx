import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RoostListingCard } from '../components/RoostListingCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface WishlistItem {
  id: string
  listing_id: string
  listing_title: string
  city: string
  country: string
  thumbnail_url?: string | null
  rating: number
  review_count: number
  price_per_night_cents: number
  saved_at: string
  collection: string | null
}

export function Wishlist() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCollection, setActiveCollection] = useState<string>('All')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/bookmarks')
      .then((res) => {
        if (!cancelled) setItems(unwrapList<WishlistItem>(res.data))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('wishlist.loadError', {}, { defaultValue: 'Failed to load wishlist.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const collections = useMemo(() => {
    const set = new Set(items.map((i) => i.collection).filter((c): c is string => c !== null))
    return ['All', ...Array.from(set)]
  }, [items])

  const visible =
    activeCollection === 'All' ? items : items.filter((i) => i.collection === activeCollection)

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.cn(cm.sp('mb', 6))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary-dark',
          )}
        >
          {t('wishlist.eyebrow', {}, { defaultValue: 'Saved stays' })}
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
          {t('wishlist.heading', {}, { defaultValue: 'Wishlist' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'wishlist.subheading',
            { count: items.length },
            { defaultValue: "{{count}} stays you've daydreamed about" },
          )}
        </p>
      </header>

      {collections.length > 1 ? (
        <div
          className={cm.cn(cm.sp('mb', 6), cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}
        >
          {collections.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCollection(c)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest rounded-full transition-colors',
                activeCollection === c
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}>
          {Array.from({ length: 6 }).map((_, i) => (
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
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            favorite
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('wishlist.empty', {}, { defaultValue: 'No saved stays yet.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-sm')}>
            {t(
              'wishlist.emptyHint',
              {},
              {
                defaultValue:
                  'Tap the heart on any listing to save it for later. Group them into collections to plan trips together.',
              },
            )}
          </p>
          <Link
            to="/search"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'inline-block bg-primary text-on-primary rounded-full hover:bg-primary-container transition-colors',
            )}
          >
            {t('nav.browseStays', {}, { defaultValue: 'Browse stays' })}
          </Link>
        </div>
      ) : (
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}>
          {visible.map((item) => (
            <RoostListingCard
              key={item.id}
              listing={{
                id: item.listing_id,
                title: item.listing_title,
                city: item.city,
                country: item.country,
                rating: item.rating,
                review_count: item.review_count,
                price_per_night_cents: item.price_per_night_cents,
                thumbnail_url: item.thumbnail_url,
                badges: [],
              }}
              bookmarked
              onToggleBookmark={async (listingId) => {
                setItems((prev) => prev.filter((i) => i.listing_id !== listingId))
                try {
                  await http.delete(`/api/bookmarks/${listingId}`)
                } catch (_error) {
                  // Optimistic removal failed — restore the item to the wishlist.
                  setItems((prev) =>
                    prev.some((i) => i.listing_id === listingId) ? prev : [...prev, item],
                  )
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
