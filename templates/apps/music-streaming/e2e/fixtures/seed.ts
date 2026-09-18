/**
 * Per-spec seed helpers for music-streaming E2E.
 *
 * Catalogue tables (artists, albums, tracks) are created by the
 * `0010_music_streaming_tables.sql` migration; this helper exposes
 * functions to insert deterministic catalogue rows directly via the
 * shared `withDb` helper. Specs can then call the read endpoints to
 * exercise the surface, and call the playlist / track-action endpoints
 * to exercise the user-owned write surface.
 */

import type { APIRequestContext } from '@molecule/app-e2e-fixtures-default'

import { apiSignup } from '../_shared/auth.js'
import { dbNameForSlug, withDb } from '../_shared/db.js'

export interface SeededUser {
  id: string
  email: string
  password: string
  authHeaders: Record<string, string>
}

const RANDOM = (): string => Math.random().toString(36).slice(2, 10)
const SLUG = 'music-streaming'

export async function seedFreshUser(
  request: APIRequestContext,
  apiUrl: string,
): Promise<SeededUser> {
  const email = `e2e-${Date.now()}-${RANDOM()}@flagship.test`
  const password = 'TestPass!1'
  const { id, authHeaders } = await apiSignup(request, { email, password, apiUrl })
  return { id, email, password, authHeaders }
}

export interface SeededArtist {
  id: string
  name: string
}

export interface SeededAlbum {
  id: string
  artist_id: string
  title: string
}

export interface SeededTrack {
  id: string
  artist_id: string
  album_id: string
  title: string
  duration_ms: number
}

/**
 * Seeds a small artist / album / tracks tree directly into Postgres.
 * Returns ids for spec assertions.
 */
export async function seedArtistTree(): Promise<{
  artist: SeededArtist
  album: SeededAlbum
  tracks: SeededTrack[]
}> {
  const artistId = crypto.randomUUID()
  const albumId = crypto.randomUUID()
  const trackIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]
  const dbName = dbNameForSlug(SLUG)
  await withDb(dbName, async (client) => {
    await client.query(
      `INSERT INTO artists (id, name, slug, bio, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [artistId, 'Reverb Test Artist', `reverb-${RANDOM()}`, 'Seeded for E2E'],
    )
    await client.query(
      `INSERT INTO albums (id, artist_id, title, type, release_date, created_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [albumId, artistId, 'Reverb E2E Album', 'album'],
    )
    for (let i = 0; i < trackIds.length; i++) {
      await client.query(
        `INSERT INTO tracks (id, album_id, artist_id, title, duration_ms, duration_seconds, track_number, play_count, genre, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          trackIds[i],
          albumId,
          artistId,
          `Track ${i + 1}`,
          180000 + i * 30000,
          180 + i * 30,
          i + 1,
          (3 - i) * 100, // descending play_count for ordering tests
          'electronic',
        ],
      )
    }
  })
  return {
    artist: { id: artistId, name: 'Reverb Test Artist' },
    album: { id: albumId, artist_id: artistId, title: 'Reverb E2E Album' },
    tracks: trackIds.map((id, i) => ({
      id,
      artist_id: artistId,
      album_id: albumId,
      title: `Track ${i + 1}`,
      duration_ms: 180000 + i * 30000,
    })),
  }
}
