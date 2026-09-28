import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { FeaturedAlbumsRow } from '../components/FeaturedAlbumsRow.js'
import { PlaylistGrid } from '../components/PlaylistGrid.js'
import { TrackTable } from '../components/TrackTable.js'
import { unwrapList } from '../lib/unwrap.js'

interface Playlist {
  id: string
  title: string
  description: string
  cover_index: number
  track_count: number
  duration_minutes: number
  category: string
  created_by: string
}

interface Album {
  id: string
  title: string
  artist: string
  artist_id: string
  cover_index: number
  year: number
  track_count: number
  duration_minutes: number
  description: string
  label: string
}

interface Artist {
  id: string
  name: string
  cover_index: number
  monthly_listeners: number
  followers: number
  followed: boolean
  genres: string[]
}

interface LikedTrack {
  id: string
  title: string
  artist: string
  artist_id: string
  album: string
  album_id: string
  duration_seconds: number
  cover_index: number
  liked: boolean
  added_at: string
  play_count: number
}

const TABS = ['playlists', 'albums', 'artists', 'liked'] as const
type Tab = (typeof TABS)[number]

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
  'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
]

export function Library() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tab, setTab] = useState<Tab>('playlists')
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [liked, setLiked] = useState<LikedTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/playlists/saved'),
      http.get('/api/albums'),
      http.get('/api/artists'),
      http.get('/api/tracks?liked=true'),
    ])
      .then(([p, al, a, l]) => {
        if (cancelled) return
        setPlaylists(unwrapList<Playlist>(p))
        setAlbums(unwrapList<Album>(al))
        // The API returns the full catalogue decorated with a per-user
        // `followed` flag — the library only lists artists you follow.
        setArtists(unwrapList<Artist>(a).filter((ar) => ar.followed))
        const allLiked = unwrapList<LikedTrack>(l)
        setLiked(allLiked.filter((tr) => tr.liked))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('library.loadError', {}, { defaultValue: 'Failed to load library.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const summary = useMemo(
    () => [
      {
        key: 'playlists',
        label: t('library.summary.playlists', {}, { defaultValue: 'Playlists' }),
        value: playlists.length,
      },
      {
        key: 'albums',
        label: t('library.summary.albums', {}, { defaultValue: 'Albums' }),
        value: albums.length,
      },
      {
        key: 'artists',
        label: t('library.summary.artists', {}, { defaultValue: 'Artists' }),
        value: artists.length,
      },
      {
        key: 'liked',
        label: t('library.summary.liked', {}, { defaultValue: 'Liked' }),
        value: liked.length,
      },
    ],
    [playlists.length, albums.length, artists.length, liked.length, t],
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-10')}>
      <header className={cm.cn('space-y-2')}>
        <p className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('library.eyebrow', {}, { defaultValue: 'Saved · followed · liked' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]')}>
          {t('nav.yourLibrary', {}, { defaultValue: 'Your library' })}
        </h1>
        <p className={cm.cn('text-base text-on-surface-variant max-w-2xl')}>
          {t(
            'library.subheading',
            {},
            { defaultValue: 'Everything you\u2019ve saved, followed, and liked — in one place.' },
          )}
        </p>
      </header>

      {/* Summary KPI strip */}
      <ul className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-4')}>
        {summary.map((s) => (
          <li
            key={s.key}
            className={cm.cn(
              cm.accentCard({ tone: 'primary' }),
              'bg-surface-container-lowest rounded-2xl p-5 hover:-translate-y-0.5 transition-transform',
            )}
          >
            <p className={cm.accentCardLabel({ tone: 'primary' })}>{s.label}</p>
            <p className={cm.cn('text-3xl font-extrabold tracking-tight tabular-nums mt-1')}>
              {s.value}
            </p>
          </li>
        ))}
      </ul>

      {/* Liked songs hero CTA */}
      <Link
        to="/library/liked"
        className={cm.cn(
          'relative block overflow-hidden rounded-[2rem] text-white p-7 shadow-md hover:shadow-2xl hover:shadow-rose-500/20 transition-all hover:-translate-y-0.5',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--color-tertiary) 0%, var(--color-accent) 50%, var(--color-accent) 100%)',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-surface/15 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn('relative z-10 flex items-center gap-5')}>
          <div
            className={cm.cn('w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg')}
            style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
            aria-hidden="true"
          >
            <span
              className="material-symbols-outlined text-[36px] text-white"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              favorite
            </span>
          </div>
          <div className={cm.cn('flex-1 min-w-0')}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
              {t('library.likedEyebrow', {}, { defaultValue: 'Playlist · auto-curated' })}
            </p>
            <h2
              className={cm.cn('text-2xl md:text-3xl font-extrabold tracking-tight leading-tight')}
            >
              {t('library.likedTitle', {}, { defaultValue: 'Liked Songs' })}
            </h2>
            <p className={cm.cn('text-sm text-white/80 mt-1')}>
              {t(
                'library.likedSubtitle',
                { count: liked.length },
                { defaultValue: '{{count}} liked tracks · grows as you tap the heart' },
              )}
            </p>
          </div>
          <span className="material-symbols-outlined text-3xl" aria-hidden="true">
            arrow_forward
          </span>
        </div>
      </Link>

      {/* Tabs */}
      <nav
        aria-label={t('library.tabsLabel', {}, { defaultValue: 'Library tabs' })}
        className={cm.flex({ gap: 'xs', align: 'center' })}
      >
        {TABS.map((s) => {
          const active = tab === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setTab(s)}
              className={cm.cn(
                'px-4 py-2 rounded-full text-sm font-bold transition-colors',
                active
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant hover:text-on-surface',
              )}
              aria-pressed={active}
            >
              {t(`library.tab.${s}`, {}, { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) })}
            </button>
          )
        })}
      </nav>

      {error && <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-error')}>{error}</p>}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('library.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <>
          {tab === 'playlists' && <PlaylistGrid playlists={playlists} />}
          {tab === 'albums' && (
            <FeaturedAlbumsRow
              albums={albums}
              title={t('library.albumsHeading', {}, { defaultValue: 'Saved albums' })}
              limit={albums.length}
            />
          )}
          {tab === 'artists' && artists.length === 0 && (
            <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant text-sm')}>
              {t(
                'library.artistsEmpty',
                {},
                { defaultValue: 'You aren’t following any artists yet.' },
              )}
            </p>
          )}
          {tab === 'artists' && artists.length > 0 && (
            <ul
              className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5')}
            >
              {artists.map((a) => {
                const gradient = COVER_GRADIENTS[a.cover_index % COVER_GRADIENTS.length]
                return (
                  <li key={a.id}>
                    <Link
                      to={`/artists/${a.id}`}
                      className={cm.cn(
                        'block bg-surface-container-lowest rounded-2xl p-4 text-center hover:shadow-lg transition-all hover:-translate-y-0.5 group',
                      )}
                    >
                      <div
                        className={cm.cn(
                          'w-24 h-24 mx-auto rounded-full flex items-center justify-center',
                        )}
                        style={{ background: gradient }}
                        aria-hidden="true"
                      >
                        <span
                          className={cm.cn(
                            'material-symbols-outlined text-[32px] text-white/80 group-hover:scale-110 transition-transform',
                          )}
                        >
                          person
                        </span>
                      </div>
                      <p
                        className={cm.cn(
                          'mt-3 text-sm font-extrabold tracking-tight truncate group-hover:text-primary transition-colors',
                        )}
                      >
                        {a.name}
                      </p>
                      <p className="text-[11px] text-on-surface-variant tabular-nums">
                        {(a.monthly_listeners / 1_000_000).toFixed(1)}M{' '}
                        {t('library.monthlyShort', {}, { defaultValue: 'monthly' })}
                      </p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          {tab === 'liked' && <TrackTable tracks={liked} showAlbum showAdded />}
        </>
      )}
    </div>
  )
}
