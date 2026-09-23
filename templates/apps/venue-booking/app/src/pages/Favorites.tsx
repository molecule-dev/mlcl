import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type VenueListing, VenueListingCard } from '../components/VenueListingCard.js'
import { unwrapList } from '../lib/unwrap.js'

export function Favorites() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [favorites, setFavorites] = useState<VenueListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [compareMode, setCompareMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/favorites')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<VenueListing>(res)
        setFavorites(list)
        setBookmarks(new Set(list.map((v) => v.venue_id ?? v.id)))
      })
      .catch(() => {
        if (cancelled) return
        setError(t('favorites.loadError', {}, { defaultValue: 'Failed to load favorites.' }))
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const toggleBookmark = (id: string) => {
    const wasBookmarked = bookmarks.has(id)
    setBookmarks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    if (wasBookmarked) {
      // Optimistically remove the row, then ask the API to drop it.
      const previous = favorites
      setFavorites((prev) => prev.filter((v) => (v.venue_id ?? v.id) !== id))
      http
        .delete(`/api/favorites/by-venue/${encodeURIComponent(id)}`)
        .then(() =>
          track({ name: 'favorite.removed', properties: { venue_id: id, source: 'favorites' } }),
        )
        .catch(() => {
          // Roll back if the server rejects.
          setFavorites(previous)
          setBookmarks((prev) => {
            const next = new Set(prev)
            next.add(id)
            return next
          })
        })
    } else {
      // Re-favoriting from this page is rare (the row has already
      // been removed) but we still kick the POST so a future
      // restore action lands.
      http
        .post('/api/favorites', { venue_id: id })
        .then(() =>
          track({ name: 'favorite.added', properties: { venue_id: id, source: 'favorites' } }),
        )
        .catch(() => {
          setBookmarks((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        })
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 3) next.add(id)
      return next
    })
  }

  const compared = useMemo(
    () => favorites.filter((v) => selected.has(v.venue_id ?? v.id)),
    [favorites, selected],
  )

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header
        className={cm.cn(
          cm.sp('mb', 6),
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
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
            {t('favorites.eyebrow', {}, { defaultValue: 'Saved spaces' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 2),
              'leading-tight',
            )}
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
          >
            {t('favorites.heading', {}, { defaultValue: 'Favorites' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'favorites.subheading',
              { count: favorites.length },
              { defaultValue: "{{count}} venues you've saved · pick up to 3 to compare" },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCompareMode(!compareMode)
            setSelected(new Set())
          }}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest rounded-full transition-colors',
            compareMode
              ? 'bg-primary text-on-primary'
              : 'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary',
          )}
        >
          {t(
            compareMode ? 'favorites.compareDone' : 'favorites.compareStart',
            {},
            { defaultValue: compareMode ? 'Exit compare' : 'Compare' },
          )}
        </button>
      </header>

      {compareMode && compared.length > 0 ? (
        <section
          className={cm.cn(
            cm.sp('mb', 8),
            cm.sp('p', 6),
            'bg-surface-container-low rounded-2xl border border-outline-variant/40',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t(
              'favorites.compareHeading',
              { count: compared.length },
              { defaultValue: 'Comparing {{count}} venues' },
            )}
          </h2>
          <div className={cm.cn(cm.sp('mt', 4), 'overflow-x-auto')}>
            <table className={'w-full text-sm'}>
              <thead>
                <tr className="text-left text-on-surface-variant">
                  <th
                    className={cm.cn(
                      cm.sp('py', 2),
                      cm.sp('pr', 4),
                      'uppercase tracking-widest text-xs font-bold',
                    )}
                  >
                    {t('favorites.compare.venue', {}, { defaultValue: 'Venue' })}
                  </th>
                  <th
                    className={cm.cn(
                      cm.sp('py', 2),
                      cm.sp('pr', 4),
                      'uppercase tracking-widest text-xs font-bold',
                    )}
                  >
                    {t('form.location', {}, { defaultValue: 'Location' })}
                  </th>
                  <th
                    className={cm.cn(
                      cm.sp('py', 2),
                      cm.sp('pr', 4),
                      'uppercase tracking-widest text-xs font-bold',
                    )}
                  >
                    {t('form.rate', {}, { defaultValue: 'Rate' })}
                  </th>
                  <th
                    className={cm.cn(
                      cm.sp('py', 2),
                      cm.sp('pr', 4),
                      'uppercase tracking-widest text-xs font-bold',
                    )}
                  >
                    {t('form.rating', {}, { defaultValue: 'Rating' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {compared.map((v) => (
                  <tr key={v.id}>
                    <td className={cm.cn(cm.sp('py', 3), cm.sp('pr', 4), cm.fontWeight('bold'))}>
                      {v.name}
                    </td>
                    <td
                      className={cm.cn(cm.sp('py', 3), cm.sp('pr', 4), 'text-on-surface-variant')}
                    >
                      {v.city}
                    </td>
                    <td className={cm.cn(cm.sp('py', 3), cm.sp('pr', 4), 'tabular-nums')}>
                      ${Math.round((v.rate_unit_cents ?? 0) / 100).toLocaleString()}
                      <span
                        className={cm.cn(
                          cm.sp('ml', 1),
                          cm.textSize('xs'),
                          v.rate_kind === 'day' ? 'text-violet-600' : 'text-indigo-600',
                        )}
                      >
                        {v.rate_kind === 'day' ? '/day' : '/hr'}
                      </span>
                    </td>
                    <td className={cm.cn(cm.sp('py', 3), cm.sp('pr', 4), 'tabular-nums')}>
                      {v.rating?.toFixed(1) ?? '—'} ({v.review_count ?? 0})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
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
      ) : favorites.length === 0 ? (
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
            {t('favorites.empty', {}, { defaultValue: 'No favorites yet.' })}
          </p>
          <Link
            to="/search"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors',
            )}
          >
            {t('favorites.browseCta', {}, { defaultValue: 'Browse spaces' })}
          </Link>
        </div>
      ) : (
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}>
          {favorites.map((v) => {
            const id = v.venue_id ?? v.id
            const sel = selected.has(id)
            return (
              <div key={v.id} className="relative">
                {compareMode ? (
                  <button
                    type="button"
                    onClick={() => toggleSelect(id)}
                    className={cm.cn(
                      'absolute top-3 left-3 z-10 w-7 h-7 rounded-full ring-2 transition-colors',
                      sel
                        ? 'bg-accent text-on-primary ring-accent flex items-center justify-center'
                        : 'bg-surface/95 ring-white/95',
                    )}
                    aria-label={t(
                      'favorites.compareToggle',
                      { name: v.name },
                      { defaultValue: 'Toggle compare for {{name}}' },
                    )}
                  >
                    {sel ? (
                      <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                        check
                      </span>
                    ) : null}
                  </button>
                ) : null}
                <VenueListingCard
                  venue={v}
                  bookmarked={bookmarks.has(id)}
                  onToggleBookmark={toggleBookmark}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
