/**
 * Singleton audio player shared by NowPlayingBar (transport UI) and
 * EpisodePlayer (start-from-track action).
 *
 * Why a module-level singleton instead of React context? The element
 * itself must persist across route changes so navigation never
 * interrupts playback. A module-level `<audio>` plus a tiny pub-sub
 * achieves that without forcing a context provider in every layout
 * branch.
 *
 * Progress is auto-persisted every 10s and on pause/seek/ended. The
 * player also auto-advances by popping the next item off `/api/queue`
 * when the current track ends, mirroring how listeners actually use
 * podcast apps.
 */

import { track } from '@molecule/app-analytics'

export interface PlayerTrack {
  episode_id: string
  show_id?: string | null
  episode_title: string
  show_title: string
  audio_url: string | null
  duration_seconds: number
  cover_index?: number
  start_at?: number
}

export interface PlayerState {
  track: PlayerTrack | null
  position: number
  duration: number
  isPlaying: boolean
  rate: number
  ready: boolean
}

const PROGRESS_FLUSH_INTERVAL_MS = 10_000
const SUPPORTED_RATES = [1, 1.25, 1.5, 1.75, 2] as const

let audio: HTMLAudioElement | null = null
let state: PlayerState = {
  track: null,
  position: 0,
  duration: 0,
  isPlaying: false,
  rate: 1,
  ready: false,
}
const listeners = new Set<(s: PlayerState) => void>()
let lastFlushAt = 0

function notify(): void {
  for (const l of listeners) l(state)
}

function setState(patch: Partial<PlayerState>): void {
  state = { ...state, ...patch }
  notify()
}

function ensureAudio(): HTMLAudioElement {
  if (audio) return audio
  audio = new Audio()
  audio.preload = 'metadata'
  audio.addEventListener('loadedmetadata', () => {
    setState({ duration: audio?.duration || 0, ready: true })
  })
  audio.addEventListener('timeupdate', () => {
    if (!audio) return
    setState({ position: audio.currentTime })
    const now = Date.now()
    if (now - lastFlushAt > PROGRESS_FLUSH_INTERVAL_MS) {
      lastFlushAt = now
      flushProgress(false)
    }
  })
  audio.addEventListener('play', () => setState({ isPlaying: true }))
  audio.addEventListener('pause', () => {
    setState({ isPlaying: false })
    flushProgress(false)
  })
  audio.addEventListener('ended', () => {
    setState({ isPlaying: false })
    flushProgress(true)
    if (state.track) {
      // Fire-and-forget: a completed listen is the top-of-funnel retention
      // event; analytics must never block or break playback.
      void track({
        name: 'episode.completed',
        properties: {
          episode_id: state.track.episode_id,
          show_id: state.track.show_id ?? null,
        },
      }).catch(() => {})
    }
    void advanceToNext()
  })
  return audio
}

async function flushProgress(completed: boolean): Promise<void> {
  if (!state.track) return
  try {
    await fetch(`/api/episodes/${state.track.episode_id}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        position_sec: Math.round(state.position),
        completed: completed || (state.duration > 0 && state.position >= state.duration - 1),
      }),
    })
  } catch (_error) {
    // Offline-tolerant: progress flush is best-effort and must not interrupt playback
  }
}

async function advanceToNext(): Promise<void> {
  try {
    const res = await fetch('/api/queue', { credentials: 'include' })
    if (!res.ok) return
    const items = (await res.json()) as Array<{
      id: string
      episode_id: string
      show_id?: string | null
      episode_title?: string
      show_title?: string
      duration_seconds?: number
      audio_url?: string | null
    }>
    const next = items[0]
    if (!next || !next.audio_url) return
    await play({
      episode_id: next.episode_id,
      show_id: next.show_id ?? null,
      episode_title: next.episode_title ?? '',
      show_title: next.show_title ?? '',
      audio_url: next.audio_url,
      duration_seconds: next.duration_seconds ?? 0,
    })
    // Pop the just-played item from the queue.
    try {
      await fetch(`/api/queue/${next.id}`, { method: 'DELETE', credentials: 'include' })
    } catch (_error) {
      // Queue removal is best-effort; playback already advanced
    }
  } catch (_error) {
    // Network failure fetching next queue item — playback stops gracefully
  }
}

export function subscribe(listener: (s: PlayerState) => void): () => void {
  listeners.add(listener)
  listener(state)
  return () => listeners.delete(listener)
}

export function getState(): PlayerState {
  return state
}

export async function play(track: PlayerTrack): Promise<void> {
  const el = ensureAudio()
  const switching = state.track?.episode_id !== track.episode_id
  if (switching) {
    setState({
      track,
      position: track.start_at ?? 0,
      duration: track.duration_seconds || 0,
      ready: false,
    })
    el.src = track.audio_url ?? ''
    if (track.start_at && track.start_at > 0) {
      el.currentTime = track.start_at
    }
  }
  if (!track.audio_url) {
    setState({ isPlaying: false })
    return
  }
  try {
    await el.play()
  } catch (_error) {
    // Browser autoplay policy may reject play(); reflect stopped state
    setState({ isPlaying: false })
  }
}

export function togglePlay(): void {
  const el = ensureAudio()
  if (!state.track || !state.track.audio_url) return
  if (el.paused) {
    void el.play().catch(() => setState({ isPlaying: false }))
  } else {
    el.pause()
  }
}

export function seekBy(deltaSeconds: number): void {
  const el = ensureAudio()
  if (!Number.isFinite(el.currentTime)) return
  const next = Math.max(
    0,
    Math.min(el.duration || 0 || state.duration || 0, el.currentTime + deltaSeconds),
  )
  el.currentTime = next
  setState({ position: next })
}

export function seekTo(positionSeconds: number): void {
  const el = ensureAudio()
  el.currentTime = Math.max(0, positionSeconds)
  setState({ position: el.currentTime })
}

export function cycleRate(): number {
  const el = ensureAudio()
  const idx = SUPPORTED_RATES.indexOf(state.rate as (typeof SUPPORTED_RATES)[number])
  const next = SUPPORTED_RATES[(idx + 1) % SUPPORTED_RATES.length]
  el.playbackRate = next
  setState({ rate: next })
  return next
}

/**
 * Hydrate the player from `/api/reports/now-playing` so the bar shows
 * the listener's last in-progress episode on app load. Does NOT
 * autoplay — the user must press play (browser autoplay restrictions
 * would block it anyway).
 */
export async function hydrateFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/reports/now-playing', { credentials: 'include' })
    if (!res.ok) return
    const body = (await res.json()) as null | {
      episode_id: string
      show_id?: string | null
      episode_title?: string
      show_title?: string
      audio_url?: string | null
      duration_seconds?: number
      position_sec?: number
    }
    if (!body) return
    const el = ensureAudio()
    setState({
      track: {
        episode_id: body.episode_id,
        show_id: body.show_id ?? null,
        episode_title: body.episode_title ?? '',
        show_title: body.show_title ?? '',
        audio_url: body.audio_url ?? null,
        duration_seconds: body.duration_seconds ?? 0,
      },
      position: body.position_sec ?? 0,
      duration: body.duration_seconds ?? 0,
      ready: false,
    })
    if (body.audio_url) {
      el.src = body.audio_url
      if (body.position_sec && body.position_sec > 0) {
        el.currentTime = body.position_sec
      }
    }
  } catch (_error) {
    // Server unavailable on app load; player stays empty until user starts manually
  }
}
