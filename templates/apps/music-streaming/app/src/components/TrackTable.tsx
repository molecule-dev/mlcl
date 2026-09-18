import { useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { toggleLike } from '../lib/likes.js'
import { type PlayerTrack, usePlayer } from '../lib/player.js'

interface Track {
  id: string
  title: string
  artist: string
  artist_id?: string
  album?: string
  album_id?: string
  duration_seconds: number
  cover_index: number
  liked?: boolean
  play_count?: number
  added_at?: string
  audio_url?: string | null
}

interface TrackTableProps {
  tracks: Track[]
  /** Show the album column. Defaults to true. */
  showAlbum?: boolean
  /** Show the date-added column. Defaults to false. */
  showAdded?: boolean
  /** Show liked-heart toggle. Defaults to true. */
  showLiked?: boolean
  /** Optional id of the currently-playing track — gets the now-playing accent. */
  nowPlayingId?: string
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
  'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #1e1b4b 0%, #c026d3 100%)',
]

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

function fmtAddedAt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function toPlayerTrack(t: Track): PlayerTrack {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    artist_id: t.artist_id,
    album: t.album,
    album_id: t.album_id,
    duration_seconds: t.duration_seconds,
    cover_index: t.cover_index,
    audio_url: t.audio_url ?? null,
    liked: t.liked,
  }
}

/**
 * Editorial track table — uppercase 10px column headers, hover row
 * tint, optional now-playing accent (rose text + pulsing bars glyph
 * replacing the track number), inline play button on hover, liked
 * heart, and tabular monospaced duration.
 */
export function TrackTable({
  tracks,
  showAlbum = true,
  showAdded = false,
  showLiked = true,
  nowPlayingId,
}: TrackTableProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const player = usePlayer()
  const [likedOverride, setLikedOverride] = useState<Record<string, boolean>>({})

  const handlePlay = (idx: number) => {
    const playerTracks = tracks.map(toPlayerTrack)
    void player.playList(playerTracks, idx)
  }

  const handleLike = async (trk: Track) => {
    const currently = likedOverride[trk.id] ?? trk.liked ?? false
    const newLiked = await toggleLike(http, trk.id, currently)
    setLikedOverride((prev) => ({ ...prev, [trk.id]: newLiked }))
  }

  if (tracks.length === 0) {
    return (
      <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant text-sm')}>
        {t('trackTable.empty', {}, { defaultValue: 'No tracks here yet.' })}
      </p>
    )
  }

  return (
    <div className={cm.cn('overflow-hidden rounded-2xl bg-surface-container-lowest')}>
      <div
        className={cm.cn(
          'hidden md:flex items-center gap-4 px-4 py-3 border-b border-outline-variant text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        <span className={cm.cn('w-8 text-right shrink-0')}>#</span>
        <span className={cm.cn('w-10 shrink-0')} aria-hidden="true" />
        <span className={cm.cn('flex-1 min-w-0')}>
          {t('form.title', {}, { defaultValue: 'Title' })}
        </span>
        {showAlbum && (
          <span className={cm.cn('hidden lg:block w-48 shrink-0 truncate')}>
            {t('trackTable.colAlbum', {}, { defaultValue: 'Album' })}
          </span>
        )}
        {showAdded && (
          <span className={cm.cn('hidden lg:block w-32 shrink-0')}>
            {t('trackTable.colAdded', {}, { defaultValue: 'Date added' })}
          </span>
        )}
        {showLiked && <span className={cm.cn('w-8 shrink-0')} aria-hidden="true" />}
        <span className={cm.cn('w-14 shrink-0 text-right')}>
          <span
            className={cm.cn('material-symbols-outlined text-base align-middle')}
            aria-hidden="true"
          >
            schedule
          </span>
        </span>
      </div>

      <ul className="divide-y divide-outline-variant/50">
        {tracks.map((trk, i) => {
          const gradient = COVER_GRADIENTS[trk.cover_index % COVER_GRADIENTS.length]
          const playerCurrentId = player.current?.id
          const isNowPlaying =
            (playerCurrentId && playerCurrentId === trk.id) || nowPlayingId === trk.id
          const liked = likedOverride[trk.id] ?? trk.liked ?? false
          return (
            <li
              key={trk.id}
              data-testid={`track-row-${trk.id}`}
              className={cm.cn(
                'group flex items-center gap-4 px-4 py-3 hover:bg-surface-container transition-colors',
                isNowPlaying ? 'bg-surface-container/40' : '',
              )}
            >
              <button
                type="button"
                aria-label={t(
                  'trackTable.playAria',
                  { title: trk.title },
                  { defaultValue: 'Play {{title}}' },
                )}
                onClick={() => handlePlay(i)}
                className={cm.cn(
                  'w-8 text-right shrink-0 font-mono tabular-nums text-[12px] text-on-surface-variant',
                )}
              >
                {isNowPlaying ? (
                  <span
                    className={cm.cn('material-symbols-outlined text-base text-primary')}
                    aria-label={t('trackTable.nowPlayingAria', {}, { defaultValue: 'Now playing' })}
                  >
                    graphic_eq
                  </span>
                ) : (
                  <>
                    <span className={cm.cn('group-hover:hidden')}>{i + 1}</span>
                    <span
                      className={cm.cn(
                        'hidden group-hover:inline material-symbols-outlined text-base text-on-surface',
                      )}
                    >
                      play_arrow
                    </span>
                  </>
                )}
              </button>
              <div
                className={cm.cn('w-10 h-10 rounded-md shrink-0 flex items-center justify-center')}
                style={{ background: gradient }}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-[18px] text-white/60">
                  music_note
                </span>
              </div>
              <div className={cm.cn('flex-1 min-w-0')}>
                <p
                  className={cm.cn(
                    'text-sm font-semibold truncate',
                    isNowPlaying ? 'text-primary' : 'text-on-surface',
                  )}
                >
                  {trk.title}
                </p>
                {trk.artist_id ? (
                  <Link
                    to={`/artists/${trk.artist_id}`}
                    className={cm.cn(
                      'text-xs text-on-surface-variant truncate hover:underline block',
                    )}
                  >
                    {trk.artist}
                  </Link>
                ) : (
                  <p className={cm.cn('text-xs text-on-surface-variant truncate')}>{trk.artist}</p>
                )}
              </div>
              {showAlbum &&
                trk.album &&
                (trk.album_id ? (
                  <Link
                    to={`/albums/${trk.album_id}`}
                    className={cm.cn(
                      'hidden lg:block w-48 shrink-0 truncate text-sm text-on-surface-variant hover:text-on-surface hover:underline',
                    )}
                  >
                    {trk.album}
                  </Link>
                ) : (
                  <span
                    className={cm.cn(
                      'hidden lg:block w-48 shrink-0 truncate text-sm text-on-surface-variant',
                    )}
                  >
                    {trk.album}
                  </span>
                ))}
              {showAdded && trk.added_at && (
                <span
                  className={cm.cn(
                    'hidden lg:block w-32 shrink-0 text-xs text-on-surface-variant tabular-nums',
                  )}
                >
                  {fmtAddedAt(trk.added_at)}
                </span>
              )}
              {showLiked && (
                <button
                  type="button"
                  onClick={() => {
                    void handleLike(trk)
                  }}
                  className={cm.cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors',
                    liked
                      ? 'text-error'
                      : 'text-on-surface-variant opacity-0 group-hover:opacity-100 hover:text-on-surface',
                  )}
                  data-testid={`track-like-${trk.id}`}
                  aria-label={
                    liked
                      ? t('trackTable.unlikeAria', {}, { defaultValue: 'Remove from liked' })
                      : t('trackTable.likeAria', {}, { defaultValue: 'Like' })
                  }
                  aria-pressed={liked}
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={liked ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    favorite
                  </span>
                </button>
              )}
              <span
                className={cm.cn(
                  'w-14 shrink-0 text-right text-xs text-on-surface-variant font-mono tabular-nums',
                )}
              >
                {fmtDuration(trk.duration_seconds)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
