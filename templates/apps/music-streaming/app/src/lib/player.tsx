/**
 * Global music player. Owns the single `<audio>` element so that the
 * NowPlayingBar (footer dock), NowPlaying page (full screen player),
 * and every per-track/per-playlist play button share state. Wires
 * playback into the backend so `/api/reports/now-playing` always
 * reflects the truth: starting playback POSTs `/api/tracks/:id/play`,
 * and transport changes (play/pause/seek/repeat/shuffle/volume) PATCH
 * `/api/tracks/transport`. On mount we hydrate from `/api/reports/now-playing`
 * so a reload restores the last track.
 *
 * The audio element streams from `audio_url` if the backend gives us
 * one, otherwise falls back to `/api/tracks/:id/stream` (the silent-WAV
 * generator in `api/handlers/_audio.ts`). Either way the browser's
 * HTMLAudioElement decodes real bytes and `currentTime` advances, so
 * "click play → bytes flow" is provable end-to-end.
 *
 * @module
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { track as trackEvent } from '@molecule/app-analytics'
import { useAuth, useHttpClient } from '@molecule/app-react'

import { takeNext } from './queue.js'
import { unwrapSingle } from './unwrap.js'

export interface PlayerTrack {
  id: string
  title: string
  artist: string
  artist_id?: string
  album?: string
  album_id?: string
  duration_seconds: number
  cover_index: number
  audio_url?: string | null
  liked?: boolean
}

interface NowPlayingResponse extends PlayerTrack {
  track_id: string
  track_title: string
  artist: string
  artist_id: string
  album: string
  album_id: string
  position_seconds: number
  is_playing: boolean
  is_shuffled: boolean
  repeat_mode: 'off' | 'one' | 'all'
  volume: number
  audio_url: string
  liked: boolean
}

export type RepeatMode = 'off' | 'one' | 'all'

export interface PlayerState {
  current: PlayerTrack | null
  queue: PlayerTrack[]
  isPlaying: boolean
  position: number
  duration: number
  isShuffled: boolean
  repeatMode: RepeatMode
  volume: number
}

export interface PlayerActions {
  play: (track: PlayerTrack, queue?: PlayerTrack[]) => Promise<void>
  playList: (tracks: PlayerTrack[], startIndex?: number) => Promise<void>
  toggle: () => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  next: () => Promise<void>
  previous: () => Promise<void>
  seek: (seconds: number) => void
  setVolume: (vol: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  enqueue: (trackId: string) => Promise<void>
  isCurrent: (trackId: string) => boolean
}

const PlayerContext = createContext<(PlayerState & PlayerActions) | null>(null)

const sourceFor = (track: PlayerTrack): string =>
  track.audio_url && track.audio_url.length > 0 ? track.audio_url : `/api/tracks/${track.id}/stream`

export function PlayerProvider({ children }: { children: ReactNode }) {
  const http = useHttpClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [current, setCurrent] = useState<PlayerTrack | null>(null)
  const [queue, setQueue] = useState<PlayerTrack[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')
  const [volume, setVolumeState] = useState(80)

  if (!audioRef.current && typeof window !== 'undefined') {
    const a = new Audio()
    a.preload = 'metadata'
    a.setAttribute('data-mol-player', 'true')
    audioRef.current = a
  }

  useEffect(() => {
    const a = audioRef.current
    if (!a || typeof document === 'undefined') return
    if (!a.parentNode) {
      a.style.display = 'none'
      document.body.appendChild(a)
    }
  }, [])

  // Bind audio events to React state.
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setPosition(a.currentTime)
    const onLoaded = () => setDuration(a.duration || 0)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      // For repeat-one, just rewind and continue. For repeat-all/off,
      // drain the queue if there's one, otherwise stop.
      if (repeatMode === 'one') {
        a.currentTime = 0
        a.play().catch(() => {
          /* user-gesture might be required */
        })
      } else if (queue.length > 0) {
        // Honor shuffle: pick a random next when shuffle is on, else the head in order.
        const { next, rest } = takeNext(queue, isShuffled)
        if (next) {
          setQueue(rest)
          void playInternal(next, rest, /* persist= */ true)
        }
      } else if (repeatMode === 'all' && current) {
        a.currentTime = 0
        a.play().catch(() => {
          /* swallow */
        })
      }
    }
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onLoaded)
    a.addEventListener('durationchange', onLoaded)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnded)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onLoaded)
      a.removeEventListener('durationchange', onLoaded)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('ended', onEnded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repeatMode, queue, current, isShuffled])

  // Hydrate from the backend on mount so the player survives reload.
  // Gated on auth: this provider wraps the PUBLIC routes too (landing,
  // login, pricing), and an unauthenticated GET would 401 — the browser
  // logs the failed request to the console even when the promise is
  // caught. Wait until the auth client has settled on a signed-in user.
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  useEffect(() => {
    if (!isAuthenticated || isAuthLoading) return
    let cancelled = false
    http
      .get('/api/reports/now-playing')
      .then((res) => {
        if (cancelled) return
        const np = unwrapSingle<NowPlayingResponse>(res)
        if (!np || !np.track_id) return
        const track: PlayerTrack = {
          id: np.track_id,
          title: np.track_title,
          artist: np.artist,
          artist_id: np.artist_id,
          album: np.album,
          album_id: np.album_id,
          duration_seconds: Number(np.duration_seconds ?? 0),
          cover_index: Number(np.cover_index ?? 1),
          audio_url: np.audio_url,
          liked: !!np.liked,
        }
        setCurrent(track)
        setIsShuffled(!!np.is_shuffled)
        setRepeatMode((np.repeat_mode ?? 'off') as RepeatMode)
        setVolumeState(Number(np.volume ?? 80))
        const a = audioRef.current
        if (a) {
          a.src = sourceFor(track)
          a.volume = Math.max(0, Math.min(1, Number(np.volume ?? 80) / 100))
          a.currentTime = Number(np.position_seconds ?? 0)
          // We deliberately do NOT auto-resume playback on hydrate —
          // browsers block audio without a user gesture, and silently
          // failing to resume is worse than showing a paused dock.
          setIsPlaying(false)
        }
      })
      .catch(() => {
        /* not signed in or no record yet */
      })
    return () => {
      cancelled = true
    }
  }, [http, isAuthenticated, isAuthLoading])

  const persistTransport = useCallback(
    (patch: Record<string, unknown>) => {
      void http.patch('/api/tracks/transport', patch).catch(() => {
        /* offline OK */
      })
    },
    [http],
  )

  const playInternal = useCallback(
    async (track: PlayerTrack, q: PlayerTrack[], persist: boolean): Promise<void> => {
      setCurrent(track)
      setQueue(q)
      const a = audioRef.current
      if (a) {
        const src = sourceFor(track)
        if (a.src !== src && !a.src.endsWith(src)) {
          a.src = src
          a.load()
        }
        a.currentTime = 0
        try {
          await a.play()
        } catch (_error) {
          /* user gesture required — browser policy, not a recoverable error */
        }
      }
      if (persist) {
        // Record the play and reset transport position. Errors are surfaced
        // to the console (HTTP layer). We deliberately don't swallow into
        // a try/catch so silent backend failures show up.
        await http.post(`/api/tracks/${track.id}/play`).catch(() => {
          /* not signed in */
        })
        // Domain analytics: every committed play, from any surface
        // (search row, album, playlist, queue, now-playing). Fire-and-forget.
        void trackEvent({
          name: 'track.played',
          properties: { track_id: track.id, ...(track.artist_id ? { artist_id: track.artist_id } : {}) },
        }).catch(() => {
          /* analytics is best-effort */
        })
      }
    },
    [http],
  )

  const play = useCallback(
    async (track: PlayerTrack, q?: PlayerTrack[]) => playInternal(track, q ?? [], true),
    [playInternal],
  )

  const playList = useCallback(
    async (tracks: PlayerTrack[], startIndex = 0) => {
      if (tracks.length === 0) return
      const idx = Math.max(0, Math.min(startIndex, tracks.length - 1))
      const head = tracks[idx]
      const rest = tracks.slice(idx + 1)
      await playInternal(head, rest, true)
    },
    [playInternal],
  )

  const toggle = useCallback(async () => {
    const a = audioRef.current
    if (!a || !current) return
    if (a.paused) {
      try {
        await a.play()
      } catch (_error) {
        /* swallow — browser may reject play() without user gesture; UI stays correct */
      }
      persistTransport({ is_playing: true, position_seconds: Math.floor(a.currentTime) })
    } else {
      a.pause()
      persistTransport({ is_playing: false, position_seconds: Math.floor(a.currentTime) })
    }
  }, [current, persistTransport])

  const pause = useCallback(async () => {
    const a = audioRef.current
    if (!a) return
    a.pause()
    persistTransport({ is_playing: false, position_seconds: Math.floor(a.currentTime) })
  }, [persistTransport])

  const resume = useCallback(async () => {
    const a = audioRef.current
    if (!a) return
    try {
      await a.play()
    } catch (_error) {
      /* swallow — browser may reject play() without user gesture; UI stays correct */
    }
    persistTransport({ is_playing: true, position_seconds: Math.floor(a.currentTime) })
  }, [persistTransport])

  const next = useCallback(async () => {
    // Honor shuffle: pick a random next when shuffle is on, else the head in order.
    const { next: nextTrack, rest } = takeNext(queue, isShuffled)
    if (!nextTrack) return
    setQueue(rest)
    await playInternal(nextTrack, rest, true)
  }, [queue, isShuffled, playInternal])

  const previous = useCallback(async () => {
    const a = audioRef.current
    if (a) {
      a.currentTime = 0
      persistTransport({ position_seconds: 0 })
    }
  }, [persistTransport])

  const seek = useCallback(
    (seconds: number) => {
      const a = audioRef.current
      if (!a) return
      a.currentTime = Math.max(0, Math.min(seconds, a.duration || seconds))
      persistTransport({ position_seconds: Math.floor(a.currentTime) })
    },
    [persistTransport],
  )

  const setVolume = useCallback(
    (vol: number) => {
      const clamped = Math.max(0, Math.min(100, vol))
      setVolumeState(clamped)
      const a = audioRef.current
      if (a) a.volume = clamped / 100
      persistTransport({ volume: clamped })
    },
    [persistTransport],
  )

  const toggleShuffle = useCallback(() => {
    setIsShuffled((s) => {
      const next = !s
      persistTransport({ is_shuffled: next })
      return next
    })
  }, [persistTransport])

  const cycleRepeat = useCallback(() => {
    setRepeatMode((m) => {
      const next: RepeatMode = m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'
      persistTransport({ repeat_mode: next })
      return next
    })
  }, [persistTransport])

  const enqueue = useCallback(
    async (trackId: string) => {
      await http.post('/api/queue', { track_id: trackId }).catch(() => {
        /* swallow */
      })
    },
    [http],
  )

  const isCurrent = useCallback((trackId: string) => current?.id === trackId, [current])

  const value = useMemo(
    () => ({
      current,
      queue,
      isPlaying,
      position,
      duration,
      isShuffled,
      repeatMode,
      volume,
      play,
      playList,
      toggle,
      pause,
      resume,
      next,
      previous,
      seek,
      setVolume,
      toggleShuffle,
      cycleRepeat,
      enqueue,
      isCurrent,
    }),
    [
      current,
      queue,
      isPlaying,
      position,
      duration,
      isShuffled,
      repeatMode,
      volume,
      play,
      playList,
      toggle,
      pause,
      resume,
      next,
      previous,
      seek,
      setVolume,
      toggleShuffle,
      cycleRepeat,
      enqueue,
      isCurrent,
    ],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer(): PlayerState & PlayerActions {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within a PlayerProvider')
  return ctx
}
