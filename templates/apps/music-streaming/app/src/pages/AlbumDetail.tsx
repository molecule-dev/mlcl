import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type PlayerTrack, usePlayer } from '../lib/player.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Album {
  id: string
  title: string
  artist: string
  artist_id: string
  year: number
  cover_index: number
  track_count: number
  duration_minutes: number
  label: string
  description: string
}

interface Track {
  id: string
  title: string
  artist?: string
  artist_id?: string
  cover_index?: number
  duration_seconds: number
  album_id: string
  audio_url?: string | null
}

export function AlbumDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const player = usePlayer()
  const { id = '' } = useParams<{ id: string }>()
  const [album, setAlbum] = useState<Album | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [moreByArtist, setMoreByArtist] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/albums/${id}`),
      http.get(`/api/tracks?album_id=${id}`),
      http.get('/api/albums'),
    ])
      .then(([a, ts, all]) => {
        if (cancelled) return
        const current = unwrapSingle<Album>(a)
        setAlbum(current)
        setTracks(unwrapList<Track>(ts))
        // "More by <artist>" — other albums from the same artist (design's
        // More-by section). Empty for single-album artists.
        setMoreByArtist(
          current
            ? unwrapList<Album>(all).filter(
                (al) => al.artist_id === current.artist_id && al.id !== current.id,
              )
            : [],
        )
      })
      .catch(() => {
        if (!cancelled)
          setError(t('albumDetail.loadError', {}, { defaultValue: 'Failed to load album.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!album)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('albumDetail.notFound', {}, { defaultValue: 'Album not found.' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'end', gap: 'md' }), cm.sp('p', 6), 'rounded-lg')}
        style={{
          background: `var(--color-cover-${album.cover_index})`,
          color: 'white',
          minHeight: '240px',
        }}
      >
        <div
          className={cm.cn(cm.h(40), cm.w(40), 'rounded shadow-2xl shrink-0')}
          style={{ background: `var(--color-cover-${album.cover_index})` }}
          aria-hidden="true"
        />
        <div className={cm.flex1}>
          <p
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'uppercase tracking-wider')}
          >
            {t('albumDetail.label', {}, { defaultValue: 'Album' })}
          </p>
          <h1 className={cm.cn(cm.textSize('5xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
            {album.title}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2))} style={{ opacity: 0.9 }}>
            <Link to={`/artists/${album.artist_id}`} className="underline">
              {album.artist}
            </Link>{' '}
            ·{' '}
            {t(
              'albumDetail.meta',
              { year: album.year, count: album.track_count, mins: album.duration_minutes },
              { defaultValue: '{{year}} · {{count}} tracks · {{mins}} min' },
            )}
          </p>
        </div>
      </header>

      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.maxW('2xl'))}>
        {album.description}
      </p>

      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <button
          type="button"
          data-testid="album-play-all"
          onClick={() => {
            const playerTracks: PlayerTrack[] = tracks.map((tr) => ({
              id: tr.id,
              title: tr.title,
              artist: album.artist,
              artist_id: album.artist_id,
              album: album.title,
              album_id: album.id,
              duration_seconds: tr.duration_seconds,
              cover_index: tr.cover_index ?? album.cover_index,
              audio_url: tr.audio_url ?? null,
            }))
            void player.playList(playerTracks, 0)
          }}
          disabled={tracks.length === 0}
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
          {t('albumDetail.playLabel', {}, { defaultValue: 'Play album' })}
        </button>
      </div>

      <ul className={cm.cn('space-y-1')}>
        {tracks.map((trk, i) => (
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
                const playerTracks: PlayerTrack[] = tracks.map((tr) => ({
                  id: tr.id,
                  title: tr.title,
                  artist: album.artist,
                  artist_id: album.artist_id,
                  album: album.title,
                  album_id: album.id,
                  duration_seconds: tr.duration_seconds,
                  cover_index: tr.cover_index ?? album.cover_index,
                  audio_url: tr.audio_url ?? null,
                }))
                void player.playList(playerTracks, i)
              }}
              aria-label={t(
                'albumDetail.playTrackAria',
                { title: trk.title },
                { defaultValue: 'Play {{title}}' },
              )}
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant',
                'w-6 text-right shrink-0 font-mono',
              )}
            >
              {i + 1}
            </button>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.flex1, 'truncate')}>
              {trk.title}
            </p>
            <span
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'shrink-0 font-mono')}
            >
              {Math.floor(trk.duration_seconds / 60)}:
              {(trk.duration_seconds % 60).toString().padStart(2, '0')}
            </span>
          </li>
        ))}
      </ul>

      {moreByArtist.length > 0 ? (
        <section className={cm.stack(3)}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t(
              'albumDetail.moreBy',
              { artist: album.artist },
              { defaultValue: 'More by {{artist}}' },
            )}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-5')}>
            {moreByArtist.slice(0, 5).map((al) => (
              <Link
                key={al.id}
                to={`/albums/${al.id}`}
                data-mol-id="album-more-card"
                className={cm.cn(cm.stack(2), 'group')}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'aspect-square rounded shadow-lg group-hover:scale-[1.03] transition-transform',
                  )}
                  style={{ background: `var(--color-cover-${al.cover_index})` }}
                  aria-hidden="true"
                >
                  <span
                    className="material-symbols-outlined text-on-primary text-3xl"
                    aria-hidden="true"
                  >
                    album
                  </span>
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'truncate')}>
                  {al.title}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'albumDetail.yearAlbum',
                    { year: al.year },
                    { defaultValue: '{{year}} · Album' },
                  )}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
        {t('albumDetail.label.label', {}, { defaultValue: 'Label:' })} {album.label}
      </p>
    </div>
  )
}
