import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type PlayerTrack, usePlayer } from '../lib/player.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Artist {
  id: string
  name: string
  bio: string
  cover_index?: number
  monthly_listeners: number
  followers?: number
  follower_count?: number
  followed?: boolean
  genres?: string[]
}

interface Album {
  id: string
  title: string
  artist: string
  artist_id: string
  year: number
  cover_index: number
}

interface Track {
  id: string
  title: string
  artist?: string
  artist_id?: string
  album: string
  album_id: string
  duration_seconds: number
  cover_index: number
  play_count: number
  audio_url?: string | null
}

export function ArtistDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const player = usePlayer()
  const { id = '' } = useParams<{ id: string }>()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [followed, setFollowed] = useState(false)
  const [albums, setAlbums] = useState<Album[]>([])
  const [topTracks, setTopTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/artists/${id}`),
      http.get(`/api/artists/${id}/albums`),
      http.get(`/api/artists/${id}/top-tracks`),
    ])
      .then(([a, al, ts]) => {
        if (cancelled) return
        const artistRecord = unwrapSingle<Artist>(a)
        setArtist(artistRecord)
        setFollowed(!!artistRecord?.followed)
        setAlbums(unwrapList<Album>(al))
        setTopTracks(unwrapList<Track>(ts).slice(0, 5))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('artistDetail.loadError', {}, { defaultValue: 'Failed to load artist.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const handleFollow = async () => {
    if (!artist) return
    if (followed) {
      const res = await http.delete(`/api/artists/${artist.id}/follow`).catch(() => null)
      if (res) setFollowed(false)
    } else {
      const res = await http.post(`/api/artists/${artist.id}/follow`).catch(() => null)
      if (res) setFollowed(true)
    }
  }

  const toPlayer = (trks: Track[]): PlayerTrack[] =>
    trks.map((tr) => ({
      id: tr.id,
      title: tr.title,
      artist: tr.artist ?? artist?.name ?? '',
      artist_id: tr.artist_id ?? artist?.id,
      album: tr.album,
      album_id: tr.album_id,
      duration_seconds: tr.duration_seconds,
      cover_index: tr.cover_index,
      audio_url: tr.audio_url ?? null,
    }))

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!artist)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('artistDetail.notFound', {}, { defaultValue: 'Artist not found.' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-8')}>
      <header
        className={cm.cn(cm.sp('p', 8), 'rounded-lg')}
        style={{
          background: `var(--color-cover-${artist.cover_index ?? 1})`,
          color: 'white',
          minHeight: '280px',
        }}
      >
        <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'uppercase tracking-wider')}>
          {t('artistDetail.label', {}, { defaultValue: 'Artist' })}
        </p>
        <h1 className={cm.cn(cm.textSize('6xl'), cm.fontWeight('bold'), cm.sp('mt', 2))}>
          {artist.name}
        </h1>
        <p
          className={cm.cn(cm.textSize('base'), cm.fontWeight('medium'), cm.sp('mt', 4))}
          style={{ opacity: 0.9 }}
        >
          {t(
            'artistDetail.monthlyListeners',
            { count: (artist.monthly_listeners / 1_000_000).toFixed(1) },
            { defaultValue: '{{count}}M monthly listeners' },
          )}
        </p>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 4))}>
          <button
            type="button"
            onClick={() => {
              void player.playList(toPlayer(topTracks), 0)
            }}
            disabled={topTracks.length === 0}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-full bg-primary text-on-primary disabled:opacity-50',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              play_arrow
            </span>
            {t('common.play', {}, { defaultValue: 'Play' })}
          </button>
          <button
            type="button"
            data-testid="artist-follow-toggle"
            onClick={() => {
              void handleFollow()
            }}
            aria-pressed={followed}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'rounded-full border-2',
              cm.textSize('sm'),
            )}
            style={{ borderColor: 'white', color: 'white' }}
          >
            {followed
              ? t('common.following', {}, { defaultValue: 'Following' })
              : t('common.follow', {}, { defaultValue: 'Follow' })}
          </button>
        </div>
      </header>

      <section className={cm.cn('space-y-3')}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('artistDetail.popularHeading', {}, { defaultValue: 'Popular' })}
        </h2>
        <ul className={cm.cn('space-y-1')}>
          {topTracks.map((trk, i) => (
            <li
              key={trk.id}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.flex({ align: 'center', gap: 'md' }),
                'rounded hover:bg-surface-container',
              )}
            >
              <button
                type="button"
                onClick={() => {
                  void player.playList(toPlayer(topTracks), i)
                }}
                aria-label={t(
                  'artistDetail.playTrackAria',
                  { title: trk.title },
                  { defaultValue: 'Play {{title}}' },
                )}
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                  'w-6 text-right shrink-0 font-mono',
                )}
              >
                {i + 1}
              </button>
              <div
                className={cm.cn(cm.h(10), cm.w(10), 'rounded shrink-0')}
                style={{ background: `var(--color-cover-${trk.cover_index})` }}
                aria-hidden="true"
              />
              <div className={cm.cn(cm.flex1, 'min-w-0')}>
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}>
                  {trk.title}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'truncate')}>
                  {t(
                    'artistDetail.playCount',
                    { count: (trk.play_count / 1_000_000).toFixed(1) },
                    { defaultValue: '{{count}}M plays' },
                  )}
                </p>
              </div>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  'shrink-0 font-mono',
                )}
              >
                {Math.floor(trk.duration_seconds / 60)}:
                {(trk.duration_seconds % 60).toString().padStart(2, '0')}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={cm.cn('space-y-3')}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('artistDetail.discographyHeading', {}, { defaultValue: 'Discography' })}
        </h2>
        <ul className={cm.grid({ cols: 5, gap: 'md' })}>
          {albums.map((a) => (
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
                  className={cm.cn('aspect-square rounded')}
                  style={{ background: `var(--color-cover-${a.cover_index})` }}
                  aria-hidden="true"
                />
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}>
                  {a.title}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'artistDetail.albumMeta',
                    { year: a.year },
                    { defaultValue: '{{year}} · Album' },
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-2')}>
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant',
            'uppercase tracking-wider',
          )}
        >
          {t('nav.about', {}, { defaultValue: 'About' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'))}>{artist.bio}</p>
        {artist.genres && artist.genres.length > 0 && (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'artistDetail.genres',
              { genres: artist.genres.join(', ') },
              { defaultValue: 'Genres: {{genres}}' },
            )}
          </p>
        )}
      </section>
    </div>
  )
}
