import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track as trackEvent } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type PlayerTrack, usePlayer } from '../lib/player.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface Playlist {
  id: string
  title: string
  description: string
  cover_index: number
  track_count: number
  duration_minutes: number
  created_by: string
  saved?: boolean
}

interface Track {
  id: string
  title: string
  artist: string
  artist_id?: string
  album: string
  album_id: string
  duration_seconds: number
  added_at: string
  cover_index: number
  liked: boolean
  audio_url?: string | null
}

interface PlaylistPayload extends Playlist {
  tracks?: Track[]
}

export function PlaylistDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const player = usePlayer()
  const { id = '' } = useParams<{ id: string }>()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/playlists/${id}`)
      .then((p) => {
        if (cancelled) return
        const playlistRecord = unwrapSingle<PlaylistPayload>(p)
        setPlaylist(playlistRecord)
        setSaved(!!playlistRecord?.saved)
        // The /:id endpoint returns tracks ordered by playlist position.
        // An empty array is a real answer (empty playlist) — don't fall
        // back to the full catalogue for it.
        setTracks(Array.isArray(playlistRecord?.tracks) ? playlistRecord.tracks : [])
      })
      .catch(() => {
        if (!cancelled)
          setError(t('playlistDetail.loadError', {}, { defaultValue: 'Failed to load playlist.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const toPlayer = (trks: Track[]): PlayerTrack[] =>
    trks.map((tr) => ({
      id: tr.id,
      title: tr.title,
      artist: tr.artist,
      artist_id: tr.artist_id,
      album: tr.album,
      album_id: tr.album_id,
      duration_seconds: tr.duration_seconds,
      cover_index: tr.cover_index,
      audio_url: tr.audio_url ?? null,
      liked: tr.liked,
    }))

  const handleSave = async () => {
    if (!playlist) return
    if (saved) {
      const res = await http.delete(`/api/playlists/${playlist.id}/save`).catch(() => null)
      if (res) {
        setSaved(false)
        void trackEvent({
          name: 'playlist.unsaved',
          properties: { playlist_id: playlist.id },
        }).catch(() => {
          /* analytics is best-effort */
        })
      }
    } else {
      const res = await http.post(`/api/playlists/${playlist.id}/save`).catch(() => null)
      if (res) {
        setSaved(true)
        void trackEvent({
          name: 'playlist.saved',
          properties: { playlist_id: playlist.id, track_count: playlist.track_count },
        }).catch(() => {
          /* analytics is best-effort */
        })
      }
    }
  }

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!playlist)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('playlistDetail.notFound', {}, { defaultValue: 'Playlist not found.' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-6')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'end', gap: 'md' }),
          cm.sp('p', 6),
          'rounded-lg flex-col items-start gap-4 md:flex-row md:items-end md:gap-6',
        )}
        style={{
          background: `var(--color-cover-${playlist.cover_index})`,
          color: 'white',
          minHeight: '240px',
        }}
      >
        <div
          className={cm.cn('rounded shadow-2xl shrink-0 h-28 w-28 md:h-40 md:w-40')}
          style={{
            background: `var(--color-cover-${playlist.cover_index})`,
            backgroundSize: 'cover',
          }}
          aria-hidden="true"
        />
        <div className={cm.flex1}>
          <p
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'uppercase tracking-wider')}
          >
            {t('playlistDetail.label', {}, { defaultValue: 'Playlist' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'md:text-5xl break-words',
            )}
          >
            {playlist.title}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2))} style={{ opacity: 0.9 }}>
            {playlist.description}
          </p>
          <p
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), cm.sp('mt', 2))}
            style={{ opacity: 0.85 }}
          >
            {t(
              'playlistDetail.byline',
              {
                creator: playlist.created_by,
                count: playlist.track_count,
                mins: playlist.duration_minutes,
              },
              { defaultValue: 'By {{creator}} · {{count}} tracks · {{mins}} min' },
            )}
          </p>
        </div>
      </header>

      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <button
          type="button"
          onClick={() => {
            void player.playList(toPlayer(tracks), 0)
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
          {t('common.play', {}, { defaultValue: 'Play' })}
        </button>
        <button
          type="button"
          onClick={() => {
            if (tracks.length === 0) return
            const startIdx = Math.floor(Math.random() * tracks.length)
            if (!player.isShuffled) player.toggleShuffle()
            void player.playList(toPlayer(tracks), startIdx)
          }}
          disabled={tracks.length === 0}
          className={cm.cn(
            cm.h(11),
            cm.w(11),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full border border-outline-variant disabled:opacity-50',
          )}
          aria-label={t('playlistDetail.shuffleAria', {}, { defaultValue: 'Shuffle play' })}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            shuffle
          </span>
        </button>
        <button
          type="button"
          data-testid="playlist-save-toggle"
          onClick={() => {
            void handleSave()
          }}
          aria-pressed={saved}
          className={cm.cn(
            cm.h(11),
            cm.w(11),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full border border-outline-variant',
          )}
          style={
            saved
              ? { color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }
              : undefined
          }
          aria-label={
            saved
              ? t('playlistDetail.unsaveAria', {}, { defaultValue: 'Remove from saved playlists' })
              : t('playlistDetail.saveAria', {}, { defaultValue: 'Save playlist' })
          }
        >
          <span
            className="material-symbols-outlined"
            style={saved ? { fontVariationSettings: "'FILL' 1" } : undefined}
            aria-hidden="true"
          >
            {saved ? 'favorite' : 'favorite_border'}
          </span>
        </button>
      </div>

      <ul className={cm.cn('space-y-1')}>
        <li
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.flex({ align: 'center', gap: 'md' }),
            'border-b border-outline-variant',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant',
              cm.fontWeight('medium'),
              'w-6 text-right shrink-0',
              'uppercase tracking-wider',
            )}
          >
            #
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant',
              cm.fontWeight('medium'),
              cm.flex1,
              'uppercase tracking-wider',
            )}
          >
            {t('form.title', {}, { defaultValue: 'Title' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant',
              cm.fontWeight('medium'),
              'shrink-0 hidden md:block uppercase tracking-wider',
            )}
            style={{ width: '160px' }}
          >
            {t('playlistDetail.colAlbum', {}, { defaultValue: 'Album' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant',
              cm.fontWeight('medium'),
              'shrink-0 uppercase tracking-wider',
            )}
            style={{ width: '60px', textAlign: 'right' }}
          >
            <span
              className={cm.cn('material-symbols-outlined text-base')}
              style={{ verticalAlign: 'middle' }}
              aria-hidden="true"
            >
              schedule
            </span>
          </span>
        </li>
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
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant',
                'w-6 text-right shrink-0 font-mono',
              )}
            >
              {i + 1}
            </span>
            <div
              className={cm.cn(cm.h(10), cm.w(10), 'rounded shrink-0')}
              style={{ background: `var(--color-cover-${trk.cover_index})` }}
              aria-hidden="true"
            />
            <div className={cm.cn(cm.flex1, 'min-w-0')}>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'truncate')}>
                {trk.title}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'truncate')}>
                {trk.artist}
              </p>
            </div>
            <Link
              to={`/albums/${trk.album_id}`}
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant',
                'shrink-0 hidden md:block truncate hover:text-on-surface',
              )}
              style={{ width: '160px' }}
            >
              {trk.album}
            </Link>
            <span
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'shrink-0 font-mono')}
              style={{ width: '60px', textAlign: 'right' }}
            >
              {Math.floor(trk.duration_seconds / 60)}:
              {(trk.duration_seconds % 60).toString().padStart(2, '0')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
