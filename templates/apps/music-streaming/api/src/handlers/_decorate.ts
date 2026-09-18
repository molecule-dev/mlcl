/**
 * Projection helpers — DB rows → frontend view shapes.
 *
 * The React pages were authored against fixture JSONs in `api/fixtures/`
 * which use display-friendly fields (`artist` string, `album` string,
 * `cover_index`, `liked`, `added_at`, `year`, `duration_minutes`,
 * `track_count`, etc.). Storage uses normalized FKs (`artist_id`,
 * `album_id`, `release_date`, etc.). Every handler routes responses
 * through these helpers so the contract stays in one place.
 *
 * @module
 */

import { findById, findMany } from '@molecule/api-database'

export interface ViewTrack {
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
  audio_url: string
}

export interface ViewAlbum {
  id: string
  title: string
  artist: string
  artist_id: string
  year: number
  cover_index: number
  track_count: number
  duration_minutes: number
  description: string
  label: string
  created_at: string
}

export interface ViewArtist {
  id: string
  name: string
  bio: string
  monthly_listeners: number
  follower_count: number
  followed: boolean
}

export interface ViewPlaylist {
  id: string
  title: string
  description: string
  cover_index: number
  track_count: number
  duration_minutes: number
  category: string
  created_by: string
  is_public: boolean
  saved: boolean
  owner_id: string
}

export interface ViewQueueItem {
  id: string
  position: number
  title: string
  artist: string
  album: string
  duration_seconds: number
  cover_index: number
  origin: 'now_playing' | 'next_up' | 'queue'
  track_id: string
  audio_url: string
}

export interface ViewNotification {
  id: string
  type: string
  title: string
  body: string
  href: string
  created_at: string
  unread: boolean
}

interface DBTrack {
  id: string
  title: string
  artist_id: string | null
  album_id: string | null
  duration_seconds: number
  duration_ms: number
  play_count: number
  cover_index: number
  audio_url: string | null
  created_at: string | Date
}

interface DBAlbum {
  id: string
  title: string
  artist_id: string
  release_date: string | Date | null
  cover_index: number
  track_count: number
  duration_seconds: number
  description: string | null
  label: string | null
  created_at: string | Date
}

interface DBArtist {
  id: string
  name: string
  bio: string | null
  monthly_listeners: number
  follower_count: number
}

interface DBPlaylist {
  id: string
  name: string
  description: string | null
  cover_index: number
  track_count: number
  duration_seconds: number
  category: string | null
  created_by_name: string | null
  is_public: boolean
  owner_id: string
}

const isoOf = (v: string | Date | null | undefined): string => {
  if (v == null) return new Date().toISOString()
  if (typeof v === 'string') return v
  return v.toISOString()
}

const yearOf = (v: string | Date | null | undefined): number => {
  if (v == null) return new Date().getFullYear()
  if (typeof v === 'string') return new Date(v).getFullYear()
  return v.getFullYear()
}

const ARTIST_BY_ID = new Map<string, string>()
const ALBUM_BY_ID = new Map<string, string>()

async function loadArtistName(id: string | null): Promise<string> {
  if (!id) return 'Unknown'
  const cached = ARTIST_BY_ID.get(id)
  if (cached !== undefined) return cached
  const row = await findById<DBArtist>('artists', id)
  const name = row?.name ?? 'Unknown'
  ARTIST_BY_ID.set(id, name)
  return name
}

async function loadAlbumTitle(id: string | null): Promise<string> {
  if (!id) return ''
  const cached = ALBUM_BY_ID.get(id)
  if (cached !== undefined) return cached
  const row = await findById<DBAlbum>('albums', id)
  const title = row?.title ?? ''
  ALBUM_BY_ID.set(id, title)
  return title
}

export async function decorateTrack(
  t: DBTrack,
  opts: { likedSet?: Set<string> } = {},
): Promise<ViewTrack> {
  const [artist, album] = await Promise.all([
    loadArtistName(t.artist_id),
    loadAlbumTitle(t.album_id),
  ])
  return {
    id: t.id,
    title: t.title,
    artist,
    artist_id: t.artist_id ?? '',
    album,
    album_id: t.album_id ?? '',
    duration_seconds: Number(t.duration_seconds ?? Math.floor(Number(t.duration_ms ?? 0) / 1000)),
    cover_index: Number(t.cover_index ?? 1),
    liked: opts.likedSet?.has(t.id) ?? false,
    added_at: isoOf(t.created_at),
    play_count: Number(t.play_count ?? 0),
    audio_url: t.audio_url ?? `/api/tracks/${t.id}/stream`,
  }
}

export async function decorateTracks(
  rows: DBTrack[],
  opts: { userId?: string | null } = {},
): Promise<ViewTrack[]> {
  const likedSet = new Set<string>()
  if (opts.userId && rows.length > 0) {
    const trackIds = rows.map((r) => r.id)
    const likes = await findMany<{ track_id: string }>('liked_tracks', {
      where: [
        { field: 'user_id', operator: '=', value: opts.userId },
        { field: 'track_id', operator: 'in', value: trackIds },
      ],
    })
    for (const l of likes) likedSet.add(l.track_id)
  }
  return Promise.all(rows.map((r) => decorateTrack(r, { likedSet })))
}

export async function decorateAlbum(a: DBAlbum): Promise<ViewAlbum> {
  const artist = await loadArtistName(a.artist_id)
  return {
    id: a.id,
    title: a.title,
    artist,
    artist_id: a.artist_id,
    year: yearOf(a.release_date),
    cover_index: Number(a.cover_index ?? 1),
    track_count: Number(a.track_count ?? 0),
    duration_minutes: Math.max(1, Math.round(Number(a.duration_seconds ?? 0) / 60)),
    description: a.description ?? '',
    label: a.label ?? '',
    created_at: isoOf(a.created_at),
  }
}

export async function decorateAlbums(rows: DBAlbum[]): Promise<ViewAlbum[]> {
  return Promise.all(rows.map(decorateAlbum))
}

export async function decorateArtist(
  a: DBArtist,
  opts: { followedSet?: Set<string> } = {},
): Promise<ViewArtist> {
  return {
    id: a.id,
    name: a.name,
    bio: a.bio ?? '',
    monthly_listeners: Number(a.monthly_listeners ?? 0),
    follower_count: Number(a.follower_count ?? 0),
    followed: opts.followedSet?.has(a.id) ?? false,
  }
}

export async function decoratePlaylist(
  p: DBPlaylist,
  opts: { savedSet?: Set<string> } = {},
): Promise<ViewPlaylist> {
  return {
    id: p.id,
    title: p.name,
    description: p.description ?? '',
    cover_index: Number(p.cover_index ?? 1),
    track_count: Number(p.track_count ?? 0),
    duration_minutes: Math.max(1, Math.round(Number(p.duration_seconds ?? 0) / 60)),
    category: p.category ?? 'recently_played',
    created_by: p.created_by_name ?? 'You',
    is_public: !!p.is_public,
    saved: opts.savedSet?.has(p.id) ?? false,
    owner_id: p.owner_id,
  }
}

export async function decoratePlaylists(
  rows: DBPlaylist[],
  opts: { userId?: string | null } = {},
): Promise<ViewPlaylist[]> {
  const savedSet = new Set<string>()
  if (opts.userId && rows.length > 0) {
    const playlistIds = rows.map((r) => r.id)
    const saves = await findMany<{ playlist_id: string }>('playlist_saves', {
      where: [
        { field: 'user_id', operator: '=', value: opts.userId },
        { field: 'playlist_id', operator: 'in', value: playlistIds },
      ],
    })
    for (const s of saves) savedSet.add(s.playlist_id)
  }
  return Promise.all(rows.map((r) => decoratePlaylist(r, { savedSet })))
}

export async function decorateNotifications(
  rows: Array<{
    id: string
    kind?: string | null
    payload?: Record<string, unknown> | null
    title?: string | null
    body?: string | null
    href?: string | null
    read_at: string | Date | null
    created_at: string | Date
  }>,
): Promise<ViewNotification[]> {
  return rows.map((n) => ({
    id: n.id,
    type: n.kind ?? 'system_message',
    title: n.title ?? (n.payload?.title as string | undefined) ?? 'Notification',
    body: n.body ?? (n.payload?.body as string | undefined) ?? '',
    href: n.href ?? (n.payload?.href as string | undefined) ?? '/home',
    created_at: isoOf(n.created_at),
    unread: !n.read_at,
  }))
}

export async function loadLikedTrackIds(userId: string): Promise<Set<string>> {
  const rows = await findMany<{ track_id: string }>('liked_tracks', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  })
  return new Set(rows.map((r) => r.track_id))
}

export async function loadFollowedArtistIds(userId: string): Promise<Set<string>> {
  const rows = await findMany<{ artist_id: string }>('artist_follows', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  })
  return new Set(rows.map((r) => r.artist_id))
}

export async function loadSavedPlaylistIds(userId: string): Promise<Set<string>> {
  const rows = await findMany<{ playlist_id: string }>('playlist_saves', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  })
  return new Set(rows.map((r) => r.playlist_id))
}

export type { DBAlbum, DBArtist, DBPlaylist, DBTrack }
