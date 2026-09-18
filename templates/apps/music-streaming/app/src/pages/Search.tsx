import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Track {
  id: string
  title: string
  artist: string
  artist_id: string
  album: string
  album_id: string
  duration_seconds: number
  cover_index: number
  liked: boolean
}

interface Artist {
  id: string
  name: string
  followers: number
  cover_index: number
  monthly_listeners: number
}

interface Album {
  id: string
  title: string
  artist: string
  artist_id: string
  year: number
  cover_index: number
  track_count: number
}

interface Playlist {
  id: string
  title: string
  description: string
  cover_index: number
  track_count: number
}

const CATEGORIES = ['all', 'tracks', 'artists', 'albums', 'playlists'] as const
type Category = (typeof CATEGORIES)[number]

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category>('all')
  const [tracks, setTracks] = useState<Track[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/tracks'),
      http.get('/api/artists'),
      http.get('/api/albums'),
      http.get('/api/playlists'),
    ])
      .then(([t, a, al, p]) => {
        if (cancelled) return
        setTracks(unwrapList<Track>(t))
        setArtists(unwrapList<Artist>(a))
        setAlbums(unwrapList<Album>(al))
        setPlaylists(unwrapList<Playlist>(p))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return {
      tracks: tracks.filter(
        (t) => !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q),
      ),
      artists: artists.filter((a) => !q || a.name.toLowerCase().includes(q)),
      albums: albums.filter(
        (a) => !q || a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q),
      ),
      playlists: playlists.filter((p) => !q || p.title.toLowerCase().includes(q)),
    }
  }, [query, tracks, artists, albums, playlists])

  const showTracks = category === 'all' || category === 'tracks'
  const showArtists = category === 'all' || category === 'artists'
  const showAlbums = category === 'all' || category === 'albums'
  const showPlaylists = category === 'all' || category === 'playlists'

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.cn('space-y-3')}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('common.search', {}, { defaultValue: 'Search' })}
        </h1>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'search.placeholder',
            {},
            { defaultValue: 'Songs, artists, albums, playlists…' },
          )}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('base'),
            'w-full border border-outline-variant rounded-md',
          )}
        />
        <nav
          aria-label={t('search.filterLabel', {}, { defaultValue: 'Filter results by category' })}
          className={cm.flex({ gap: 'xs', align: 'center' })}
        >
          {CATEGORIES.map((c) => {
            const active = category === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'rounded-full',
                  active
                    ? 'bg-primary text-on-primary'
                    : cm.cn('bg-surface border border-outline-variant', 'text-on-surface-variant'),
                )}
                aria-pressed={active}
              >
                {t(
                  `search.category.${c}`,
                  {},
                  { defaultValue: c.charAt(0).toUpperCase() + c.slice(1) },
                )}
              </button>
            )
          })}
        </nav>
      </header>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('search.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <div className={cm.cn('space-y-8')}>
          {(!showTracks || filtered.tracks.length === 0) &&
            (!showArtists || filtered.artists.length === 0) &&
            (!showAlbums || filtered.albums.length === 0) &&
            (!showPlaylists || filtered.playlists.length === 0) && (
              <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
                {t('search.noResults', {}, { defaultValue: 'No results' })}
              </p>
            )}
          {showTracks && filtered.tracks.length > 0 && (
            <ResultSection
              title={t(
                'search.tracksHeading',
                { count: filtered.tracks.length },
                { defaultValue: 'Tracks ({{count}})' },
              )}
            >
              <ul className={cm.cn('space-y-1')}>
                {filtered.tracks.slice(0, 8).map((t) => (
                  <li
                    key={t.id}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.flex({ align: 'center', gap: 'md' }),
                      'rounded hover:bg-surface-container',
                    )}
                  >
                    <div
                      className={cm.cn(cm.h(10), cm.w(10), 'rounded shrink-0')}
                      style={{ background: `var(--color-cover-${t.cover_index})` }}
                      aria-hidden="true"
                    />
                    <div className={cm.cn(cm.flex1, 'min-w-0')}>
                      <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'truncate')}>
                        {t.title}
                      </p>
                      <p
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'truncate')}
                      >
                        {t.artist}
                      </p>
                    </div>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        'shrink-0',
                        'font-mono',
                      )}
                    >
                      {Math.floor(t.duration_seconds / 60)}:
                      {(t.duration_seconds % 60).toString().padStart(2, '0')}
                    </span>
                  </li>
                ))}
              </ul>
            </ResultSection>
          )}

          {showArtists && filtered.artists.length > 0 && (
            <ResultSection
              title={t(
                'search.artistsHeading',
                { count: filtered.artists.length },
                { defaultValue: 'Artists ({{count}})' },
              )}
            >
              <ul className={cm.grid({ cols: 4, gap: 'md' })}>
                {filtered.artists.slice(0, 8).map((a) => (
                  <li key={a.id}>
                    <Link
                      to={`/artists/${a.id}`}
                      className={cm.cn(
                        cm.card(),
                        cm.sp('p', 4),
                        'block hover:bg-surface-container text-center',
                      )}
                    >
                      <div
                        className={cm.cn(cm.mxAuto, 'rounded-full')}
                        style={{
                          width: '120px',
                          height: '120px',
                          background: `var(--color-cover-${a.cover_index})`,
                        }}
                        aria-hidden="true"
                      />
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          cm.sp('mt', 2),
                          'truncate',
                        )}
                      >
                        {a.name}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'search.monthlyListeners',
                          { count: (a.monthly_listeners / 1_000_000).toFixed(1) },
                          { defaultValue: '{{count}}M monthly listeners' },
                        )}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </ResultSection>
          )}

          {showAlbums && filtered.albums.length > 0 && (
            <ResultSection
              title={t(
                'search.albumsHeading',
                { count: filtered.albums.length },
                { defaultValue: 'Albums ({{count}})' },
              )}
            >
              <ul className={cm.grid({ cols: 5, gap: 'md' })}>
                {filtered.albums.slice(0, 10).map((a) => (
                  <li key={a.id}>
                    <Link
                      to={`/albums/${a.id}`}
                      className={cm.cn(
                        cm.card(),
                        cm.sp('p', 4),
                        'block hover:bg-surface-container space-y-2',
                      )}
                    >
                      <div
                        className={cm.cn('aspect-square rounded-md')}
                        style={{ background: `var(--color-cover-${a.cover_index})` }}
                        aria-hidden="true"
                      />
                      <p
                        className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}
                      >
                        {a.title}
                      </p>
                      <p
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'truncate')}
                      >
                        {a.artist} · {a.year}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </ResultSection>
          )}

          {showPlaylists && filtered.playlists.length > 0 && (
            <ResultSection
              title={t(
                'search.playlistsHeading',
                { count: filtered.playlists.length },
                { defaultValue: 'Playlists ({{count}})' },
              )}
            >
              <ul className={cm.grid({ cols: 5, gap: 'md' })}>
                {filtered.playlists.slice(0, 10).map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/playlists/${p.id}`}
                      className={cm.cn(
                        cm.card(),
                        cm.sp('p', 4),
                        'block hover:bg-surface-container space-y-2',
                      )}
                    >
                      <div
                        className={cm.cn('aspect-square rounded-md')}
                        style={{ background: `var(--color-cover-${p.cover_index})` }}
                        aria-hidden="true"
                      />
                      <p
                        className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}
                      >
                        {p.title}
                      </p>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          'line-clamp-2',
                        )}
                      >
                        {p.description}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </ResultSection>
          )}
        </div>
      )}
    </div>
  )
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <section>
      <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 3))}>{title}</h2>
      {children}
    </section>
  )
}
