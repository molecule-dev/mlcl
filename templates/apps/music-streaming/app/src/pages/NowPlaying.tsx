import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { toggleLike } from '../lib/likes.js'
import { type PlayerTrack, usePlayer } from '../lib/player.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiTrack {
  id: string
  title: string
  artist: string
  artist_id: string
  album: string
  album_id: string
  duration_seconds: number
  cover_index: number
  liked: boolean
  play_count: number
  audio_url?: string | null
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #c2410c 100%)',
  'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
  'linear-gradient(135deg, #ec4899 0%, #9d174d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)',
  'linear-gradient(135deg, #1e1b4b 0%, #c026d3 100%)',
]

const SAMPLE_LYRICS = [
  'I drove out to the long shore',
  'And waited for the lights to dim',
  'You said you’d meet me by the door',
  'With nothing but the wind on you',
  'And every word, a careful thing',
  'Half a second from the truth',
  'I’ve learned to hold them like the rain',
  'And let them fall right through',
] as const

const BAR_COUNT = 64

function fmtElapsed(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function toPlayerTrack(t: ApiTrack): PlayerTrack {
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

export function NowPlaying() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const player = usePlayer()
  const [popular, setPopular] = useState<ApiTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'queue' | 'lyrics'>('queue')
  const [tick, setTick] = useState(0)
  const [likedOverride, setLikedOverride] = useState<boolean | undefined>(undefined)

  // Fall back to "popular tracks" so first-time visitors who haven't played
  // anything yet still see the player. The Up-next list reads from the
  // shared player queue when populated.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/tracks')
      .then((res) => {
        if (!cancelled) setPopular(unwrapList<ApiTrack>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('nowPlaying.loadError', {}, { defaultValue: 'Failed to load player.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  // 600ms ticker drives the waveform animation only.
  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 600)
    return () => window.clearInterval(id)
  }, [])

  const fallback = useMemo<ApiTrack | null>(() => {
    if (popular.length === 0) return null
    return [...popular].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0))[0]
  }, [popular])

  const current: PlayerTrack | null = player.current ?? (fallback ? toPlayerTrack(fallback) : null)
  const upNext: PlayerTrack[] =
    player.queue.length > 0
      ? player.queue
      : popular
          .filter((p) => p.id !== current?.id)
          .slice(0, 8)
          .map(toPlayerTrack)

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading || !current) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('nowPlaying.loading', {}, { defaultValue: 'Loading player…' })}
      </p>
    )
  }

  const totalDuration = player.duration > 0 ? player.duration : current.duration_seconds || 0
  const elapsed = player.position
  const progress = totalDuration > 0 ? Math.min(1, elapsed / totalDuration) : 0
  const gradient = COVER_GRADIENTS[current.cover_index % COVER_GRADIENTS.length]
  const activeBar = Math.floor(((tick % BAR_COUNT) + BAR_COUNT * progress) % BAR_COUNT)
  const liked = likedOverride ?? current.liked ?? false

  const handleLike = async () => {
    const newLiked = await toggleLike(http, current.id, liked)
    setLikedOverride(newLiked)
  }

  const handlePlayCurrent = () => {
    if (!player.current && fallback) {
      void player.play(toPlayerTrack(fallback), upNext)
    } else {
      void player.toggle()
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-9rem)]">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: gradient,
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 70%)',
          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute -right-24 top-12 w-96 h-96 rounded-full bg-surface/10 blur-3xl -z-10',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute -left-24 top-32 w-72 h-72 rounded-full bg-foreground/20 blur-3xl -z-10',
        )}
        aria-hidden="true"
      />

      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 10), cm.maxW('7xl'), cm.mxAuto)}>
        <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-10 items-start')}>
          {/* Left — large artwork */}
          <div className={cm.cn('lg:col-span-5 flex flex-col items-center')}>
            <div
              className={cm.cn(
                'relative w-full max-w-md aspect-square rounded-[2rem] shadow-2xl shadow-black/40 overflow-hidden flex items-center justify-center',
              )}
              style={{ background: gradient }}
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-black/20" />
              <span className="material-symbols-outlined text-[180px] text-white/80 relative z-10">
                graphic_eq
              </span>
              <div
                className={cm.cn(
                  'absolute bottom-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface/20 backdrop-blur-md text-white',
                )}
              >
                {t('nowPlaying.losslessLabel', {}, { defaultValue: 'Lossless' })}
              </div>
            </div>

            {/* Animated waveform — 64 bars */}
            <div
              className={cm.cn('flex items-end justify-center gap-[2px] mt-8 h-12 w-full max-w-md')}
              aria-hidden="true"
            >
              {Array.from({ length: BAR_COUNT }).map((_, i) => {
                const distance = Math.abs(i - activeBar)
                const intensity = Math.max(0.18, 1 - distance / 16)
                const height = `${20 + Math.sin((i + tick) * 0.6) * 30 + intensity * 30}%`
                const isActive = i / BAR_COUNT <= progress
                return (
                  <span
                    key={i}
                    className={cm.cn('w-[3px] rounded-full transition-all')}
                    style={{
                      height,
                      background: isActive ? 'currentColor' : 'rgba(255,255,255,0.18)',
                      color: isActive ? 'var(--color-primary)' : undefined,
                      opacity: isActive ? 0.4 + intensity * 0.6 : 0.4,
                    }}
                  />
                )
              })}
            </div>
          </div>

          {/* Right — metadata + controls + queue/lyrics tabs */}
          <div className={cm.cn('lg:col-span-7 text-on-surface flex flex-col gap-6')}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                {t('nowPlaying.eyebrow', {}, { defaultValue: 'Now playing · from your queue' })}
              </p>
              <h1
                className={cm.cn(
                  'text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] mt-3',
                )}
              >
                {current.title}
              </h1>
              {current.artist_id ? (
                <Link
                  to={`/artists/${current.artist_id}`}
                  className={cm.cn(
                    'text-lg text-on-surface-variant mt-2 inline-block hover:underline decoration-2 underline-offset-4',
                  )}
                >
                  {current.artist}
                </Link>
              ) : (
                <p className={cm.cn('text-lg text-on-surface-variant mt-2')}>{current.artist}</p>
              )}
              {current.album_id ? (
                <Link
                  to={`/albums/${current.album_id}`}
                  className={cm.cn(
                    'block text-sm text-on-surface-variant mt-1 hover:text-on-surface transition-colors',
                  )}
                >
                  {current.album}
                </Link>
              ) : null}
            </div>

            {/* Scrubber */}
            <div className={cm.cn('space-y-2')}>
              <div
                className={cm.cn(
                  'flex items-center gap-3 text-[11px] font-mono tabular-nums text-on-surface-variant',
                )}
              >
                <span data-testid="now-playing-page-position">{fmtElapsed(elapsed)}</span>
                <button
                  type="button"
                  className={cm.cn(
                    'flex-1 h-1.5 rounded-full bg-surface-container-high overflow-hidden cursor-pointer',
                  )}
                  aria-label={t('nowPlaying.seekAria', {}, { defaultValue: 'Seek' })}
                  onClick={(e) => {
                    if (totalDuration <= 0) return
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    const ratio = (e.clientX - rect.left) / rect.width
                    player.seek(Math.max(0, Math.min(1, ratio)) * totalDuration)
                  }}
                >
                  <div
                    className={cm.cn('h-full bg-primary rounded-full transition-all')}
                    style={{ width: `${progress * 100}%` }}
                    aria-hidden="true"
                  />
                </button>
                <span>{fmtElapsed(totalDuration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div
              className={cm.cn('flex items-center justify-between')}
              aria-label={t('nowPlaying.controlsLabel', {}, { defaultValue: 'Player controls' })}
            >
              <button
                type="button"
                onClick={() => player.toggleShuffle()}
                aria-pressed={player.isShuffled}
                className={cm.cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors',
                )}
                aria-label={t('nowPlaying.shuffleAria', {}, { defaultValue: 'Shuffle' })}
              >
                <span
                  className="material-symbols-outlined"
                  style={player.isShuffled ? { color: 'var(--color-primary)' } : undefined}
                >
                  shuffle
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void player.previous()
                }}
                className={cm.cn(
                  'w-12 h-12 rounded-full flex items-center justify-center text-on-surface hover:text-primary transition-colors',
                )}
                aria-label={t('nowPlaying.previousAria', {}, { defaultValue: 'Previous track' })}
              >
                <span className="material-symbols-outlined text-[32px]">skip_previous</span>
              </button>
              <button
                type="button"
                data-testid="now-playing-page-toggle"
                onClick={handlePlayCurrent}
                className={cm.cn(
                  'w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-xl shadow-primary/30 hover:scale-105 transition-transform',
                )}
                aria-label={
                  player.isPlaying
                    ? t('common.pause', {}, { defaultValue: 'Pause' })
                    : t('common.play', {}, { defaultValue: 'Play' })
                }
              >
                <span
                  className="material-symbols-outlined text-[36px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {player.isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void player.next()
                }}
                className={cm.cn(
                  'w-12 h-12 rounded-full flex items-center justify-center text-on-surface hover:text-primary transition-colors',
                )}
                aria-label={t('nowPlaying.nextAria', {}, { defaultValue: 'Next track' })}
              >
                <span className="material-symbols-outlined text-[32px]">skip_next</span>
              </button>
              <button
                type="button"
                onClick={() => player.cycleRepeat()}
                aria-pressed={player.repeatMode !== 'off'}
                className={cm.cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors',
                )}
                aria-label={t('nowPlaying.repeatAria', {}, { defaultValue: 'Repeat' })}
              >
                <span
                  className="material-symbols-outlined"
                  style={
                    player.repeatMode !== 'off' ? { color: 'var(--color-primary)' } : undefined
                  }
                >
                  {player.repeatMode === 'one' ? 'repeat_one' : 'repeat'}
                </span>
              </button>
            </div>

            {/* Action row — like, queue, devices, share */}
            <div className={cm.cn('flex items-center gap-2 text-on-surface-variant')}>
              <button
                type="button"
                onClick={() => {
                  void handleLike()
                }}
                className={cm.cn(
                  'px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-outline-variant flex items-center gap-2 hover:bg-surface-container-low transition-colors',
                  liked ? 'text-error border-rose-500/40' : '',
                )}
                aria-pressed={liked}
                aria-label={t('nowPlaying.likeAria', {}, { defaultValue: 'Add to liked songs' })}
              >
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={liked ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  favorite
                </span>
                {liked
                  ? t('nowPlaying.likedLabel', {}, { defaultValue: 'Liked' })
                  : t('nowPlaying.likeLabel', {}, { defaultValue: 'Like' })}
              </button>
              <Link
                to="/queue"
                className={cm.cn(
                  'px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-outline-variant flex items-center gap-2 hover:bg-surface-container-low transition-colors',
                )}
              >
                <span className="material-symbols-outlined text-[18px]">queue_music</span>
                {t('nowPlaying.queueLabel', {}, { defaultValue: 'Queue' })}
              </Link>
              <button
                type="button"
                onClick={() => {
                  void player.enqueue(current.id)
                }}
                className={cm.cn(
                  'px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-outline-variant flex items-center gap-2 hover:bg-surface-container-low transition-colors',
                )}
              >
                <span className="material-symbols-outlined text-[18px]">playlist_add</span>
                {t('nowPlaying.addToQueueLabel', {}, { defaultValue: 'Queue this' })}
              </button>
            </div>

            {/* Tabs */}
            <div className={cm.cn('bg-surface-container-lowest rounded-2xl')}>
              <div className={cm.cn('flex border-b border-outline-variant')}>
                <button
                  type="button"
                  onClick={() => setTab('queue')}
                  aria-pressed={tab === 'queue'}
                  className={cm.cn(
                    'flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors',
                    tab === 'queue'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t(
                    'nowPlaying.tab.queue',
                    { count: upNext.length },
                    { defaultValue: 'Up next ({{count}})' },
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTab('lyrics')}
                  aria-pressed={tab === 'lyrics'}
                  className={cm.cn(
                    'flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors',
                    tab === 'lyrics'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('nowPlaying.tab.lyrics', {}, { defaultValue: 'Lyrics' })}
                </button>
              </div>

              {tab === 'queue' ? (
                <ul
                  className={cm.cn('divide-y divide-outline-variant/40 max-h-96 overflow-y-auto')}
                >
                  {upNext.map((trk, i) => {
                    const tg = COVER_GRADIENTS[trk.cover_index % COVER_GRADIENTS.length]
                    return (
                      <li
                        key={trk.id}
                        className={cm.cn(
                          'flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container transition-colors',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            void player.play(trk, upNext.slice(i + 1))
                          }}
                          aria-label={t(
                            'nowPlaying.playTrackAria',
                            { title: trk.title },
                            { defaultValue: 'Play {{title}}' },
                          )}
                          className={cm.cn(
                            'w-6 text-right text-xs text-on-surface-variant font-mono tabular-nums shrink-0',
                          )}
                        >
                          {i + 1}
                        </button>
                        <div
                          className={cm.cn(
                            'w-9 h-9 rounded-md shrink-0 flex items-center justify-center',
                          )}
                          style={{ background: tg }}
                          aria-hidden="true"
                        >
                          <span className="material-symbols-outlined text-[16px] text-white/60">
                            music_note
                          </span>
                        </div>
                        <div className={cm.cn('flex-1 min-w-0')}>
                          <p className={cm.cn('text-sm font-semibold truncate text-on-surface')}>
                            {trk.title}
                          </p>
                          <p className={cm.cn('text-xs text-on-surface-variant truncate')}>
                            {trk.artist}
                          </p>
                        </div>
                        <span
                          className={cm.cn(
                            'text-xs text-on-surface-variant font-mono tabular-nums shrink-0',
                          )}
                        >
                          {fmtElapsed(trk.duration_seconds)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div
                  className={cm.cn(
                    'px-6 py-5 max-h-96 overflow-y-auto space-y-2 font-headline text-lg leading-snug',
                  )}
                >
                  {SAMPLE_LYRICS.map((line, i) => (
                    <p
                      key={i}
                      className={cm.cn(
                        'transition-colors',
                        i === Math.floor(progress * SAMPLE_LYRICS.length)
                          ? 'text-on-surface font-bold'
                          : 'text-on-surface-variant',
                      )}
                    >
                      {t(`nowPlaying.lyrics.${i}`, {}, { defaultValue: line })}
                    </p>
                  ))}
                  <p
                    className={cm.cn(
                      'text-[10px] text-on-surface-variant uppercase tracking-widest pt-3',
                    )}
                  >
                    {t(
                      'nowPlaying.lyricsCredit',
                      {},
                      { defaultValue: 'Sample lyric · synced when available' },
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
