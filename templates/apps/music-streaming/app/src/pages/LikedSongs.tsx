import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TrackTable } from '../components/TrackTable.js'
import { usePlayer } from '../lib/player.js'
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
  added_at: string
  play_count: number
}

const LIKED_GRADIENT = 'linear-gradient(135deg, #8b5cf6 0%, #be185d 50%, #f43f5e 100%)'

export function LikedSongs() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const player = usePlayer()
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/tracks?liked=true')
      .then((res) => {
        if (cancelled) return
        const all = unwrapList<Track>(res)
        setTracks(all.filter((tr) => tr.liked))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('likedSongs.loadError', {}, { defaultValue: 'Failed to load liked songs.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const totalMinutes = useMemo(
    () => Math.round(tracks.reduce((sum, tr) => sum + tr.duration_seconds, 0) / 60),
    [tracks],
  )

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-8')}>
      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] text-white p-8 md:p-10 shadow-2xl shadow-rose-500/20',
        )}
        style={{ background: LIKED_GRADIENT, minHeight: '260px' }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute right-12 top-12 w-24 h-24 rounded-full bg-foreground/10 blur-2xl',
          )}
          aria-hidden="true"
        />

        <div
          className={cm.cn(
            'relative z-10 flex flex-col md:flex-row items-start md:items-end gap-6',
          )}
        >
          <div
            className={cm.cn(
              'w-32 h-32 md:w-40 md:h-40 rounded-2xl shrink-0 flex items-center justify-center shadow-2xl shadow-black/30',
            )}
            style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
            aria-hidden="true"
          >
            <span
              className={cm.cn('material-symbols-outlined text-[80px] md:text-[96px] text-white')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              favorite
            </span>
          </div>
          <div className={cm.cn('flex-1 min-w-0')}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
              {t('likedSongs.eyebrow', {}, { defaultValue: 'Playlist' })}
            </p>
            <h1
              className={cm.cn(
                'text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mt-1 leading-[1.05]',
              )}
            >
              {t('likedSongs.heading', {}, { defaultValue: 'Liked Songs' })}
            </h1>
            <p className={cm.cn('text-sm text-white/80 mt-2')}>
              {t(
                'likedSongs.subheading',
                { count: tracks.length, mins: totalMinutes },
                { defaultValue: '{{count}} liked tracks · {{mins}} minutes' },
              )}
            </p>
            <div className={cm.cn('flex items-center gap-3 mt-5')}>
              <button
                type="button"
                onClick={() => {
                  void player.playList(tracks, 0)
                }}
                disabled={tracks.length === 0}
                className={cm.cn(
                  'px-7 py-3 rounded-full text-sm font-bold bg-surface text-on-surface hover:bg-surface/90 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  play_arrow
                </span>
                {t('likedSongs.playAll', {}, { defaultValue: 'Play all' })}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tracks.length === 0) return
                  const startIdx = Math.floor(Math.random() * tracks.length)
                  if (!player.isShuffled) player.toggleShuffle()
                  void player.playList(tracks, startIdx)
                }}
                disabled={tracks.length === 0}
                className={cm.cn(
                  'px-7 py-3 rounded-full text-sm font-bold border border-surface/30 text-white hover:bg-surface/10 transition-colors flex items-center gap-2 disabled:opacity-50',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  shuffle
                </span>
                {t('likedSongs.shuffle', {}, { defaultValue: 'Shuffle' })}
              </button>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('likedSongs.loading', {}, { defaultValue: 'Loading liked songs…' })}
        </p>
      ) : (
        <TrackTable tracks={tracks} showAlbum showAdded />
      )}
    </div>
  )
}
