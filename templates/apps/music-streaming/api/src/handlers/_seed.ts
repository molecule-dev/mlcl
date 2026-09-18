/**
 * Demo seed for music-streaming.
 *
 * Two layers:
 *
 * 1. **Globals** (`seedGlobalCatalogIfEmpty`) — artists, albums, tracks,
 *    playlists, radio stations. Idempotent: if any artist row exists we
 *    skip globals entirely. Called once at server boot.
 *
 * 2. **Per-user** (`seedDemoForUser`) — starter notifications + a couple
 *    of liked tracks + one saved playlist + initial preferences row so
 *    the freshly signed-up user lands on a Home / Notifications /
 *    LikedSongs page that actually shows something. Idempotent on
 *    user_id (skips if a notifications row already exists).
 *
 * @module
 */

import { count, create, findMany, findOne } from '@molecule/api-database'

interface ArtistSeed {
  name: string
  slug: string
  bio: string
  monthly_listeners: number
}

interface AlbumSeed {
  title: string
  artist_slug: string
  year: number
  cover_index: number
  description: string
  label: string
  tracks: { title: string; duration_seconds: number; cover_index?: number; play_count: number }[]
}

interface PlaylistSeed {
  name: string
  description: string
  cover_index: number
  category: 'made_for_you' | 'recently_played' | 'featured' | 'mood'
  created_by: string
  // Track positions are filled from any tracks whose artist or album
  // mentions a string in track_filters (substring match on artist name
  // or album title); first N matches in catalogue order seed the playlist.
  track_filters?: string[]
  size: number
}

const ARTISTS: ArtistSeed[] = [
  {
    name: 'Helio Brace',
    slug: 'helio-brace',
    bio: 'Lisbon-based folk-electronic composer.',
    monthly_listeners: 2_840_000,
  },
  {
    name: 'Tessa Mira',
    slug: 'tessa-mira',
    bio: 'Reverb-soaked indie pop from the Pacific Northwest.',
    monthly_listeners: 8_410_000,
  },
  {
    name: 'DJ Ferrier',
    slug: 'dj-ferrier',
    bio: 'Afrohouse meets progressive techno.',
    monthly_listeners: 12_120_000,
  },
  {
    name: 'The Quiet Hours',
    slug: 'the-quiet-hours',
    bio: 'Instrumental post-rock built on long crescendos.',
    monthly_listeners: 642_000,
  },
  {
    name: 'Mara Sokol',
    slug: 'mara-sokol',
    bio: 'Folk songs about a quiet year.',
    monthly_listeners: 1_180_000,
  },
  {
    name: 'Soraya',
    slug: 'soraya',
    bio: 'Argentinian neo-soul singer.',
    monthly_listeners: 4_520_000,
  },
]

const ALBUMS: AlbumSeed[] = [
  {
    title: 'Slow Lights',
    artist_slug: 'helio-brace',
    year: 2024,
    cover_index: 3,
    description:
      "Helio's third record — orchestral folk with electronic underpinnings. Recorded in a Lisbon church.",
    label: 'Stay Together',
    tracks: [
      { title: 'First Hour', duration_seconds: 257, play_count: 8_410_000 },
      { title: 'Departures', duration_seconds: 189, play_count: 4_280_000 },
      { title: 'Lighthouse Keeper', duration_seconds: 312, play_count: 1_840_000 },
      { title: 'Thirteen', duration_seconds: 224, play_count: 980_000 },
    ],
  },
  {
    title: 'Hello, Stranger',
    artist_slug: 'tessa-mira',
    year: 2024,
    cover_index: 4,
    description:
      'Universally acclaimed sophomore album. Reverb-drenched indie pop with autobiographical lyrics.',
    label: 'Sub Pop',
    tracks: [
      { title: 'When You Said', duration_seconds: 211, play_count: 24_300_000 },
      { title: 'Cardinal', duration_seconds: 245, play_count: 18_410_000 },
      { title: 'Driving Home', duration_seconds: 192, play_count: 12_840_000 },
      { title: 'Static', duration_seconds: 198, play_count: 5_120_000 },
    ],
  },
  {
    title: 'Polychrome',
    artist_slug: 'dj-ferrier',
    year: 2025,
    cover_index: 6,
    description: "DJ Ferrier's mainstream breakthrough — Afrohouse fused with progressive techno.",
    label: 'Defected',
    tracks: [
      { title: 'Night Lift', duration_seconds: 421, play_count: 41_200_000 },
      { title: 'Fjord', duration_seconds: 398, play_count: 28_910_000 },
      { title: 'Rotor', duration_seconds: 372, play_count: 14_220_000 },
    ],
  },
  {
    title: 'Mountain, Snow',
    artist_slug: 'the-quiet-hours',
    year: 2023,
    cover_index: 5,
    description: 'Post-rock instrumental record. Six- to twelve-minute crescendos.',
    label: 'Bedroom Suck',
    tracks: [
      { title: 'Cable Car', duration_seconds: 487, play_count: 1_240_000 },
      { title: 'Hold Fast', duration_seconds: 562, play_count: 880_000 },
    ],
  },
  {
    title: 'Living Room',
    artist_slug: 'mara-sokol',
    year: 2024,
    cover_index: 2,
    description: 'Folk songs about a quiet year. Mostly guitar and vocals; occasional cello.',
    label: 'Mom + Pop',
    tracks: [
      { title: 'Window Light', duration_seconds: 224, play_count: 760_000 },
      { title: 'Old Bedroom', duration_seconds: 198, play_count: 540_000 },
    ],
  },
  {
    title: 'Velvet Hour',
    artist_slug: 'soraya',
    year: 2024,
    cover_index: 6,
    description:
      'Neo-soul that blends Argentinian rhythms with sumptuous late-night R&B production.',
    label: 'Atlantic',
    tracks: [
      { title: 'Velvet Hour', duration_seconds: 218, play_count: 6_120_000 },
      { title: 'Late Lights', duration_seconds: 245, play_count: 3_480_000 },
    ],
  },
]

const PLAYLISTS: PlaylistSeed[] = [
  {
    name: 'Daily Mix 1',
    description: 'Indie folk and dream pop, gently sequenced.',
    cover_index: 1,
    category: 'made_for_you',
    created_by: 'Reverb',
    size: 6,
  },
  {
    name: 'Daily Mix 2',
    description: 'Electronic and shoegaze — the louder, brighter half.',
    cover_index: 3,
    category: 'made_for_you',
    created_by: 'Reverb',
    size: 5,
  },
  {
    name: 'Discover Weekly',
    description: '30 fresh tracks. Refreshes every Monday.',
    cover_index: 4,
    category: 'made_for_you',
    created_by: 'Reverb',
    size: 8,
  },
  {
    name: 'Release Radar',
    description: 'New from artists you follow.',
    cover_index: 6,
    category: 'made_for_you',
    created_by: 'Reverb',
    size: 6,
  },
  {
    name: 'Hello Future',
    description: 'Lush synthwave + neo-disco. Volume up.',
    cover_index: 6,
    category: 'recently_played',
    created_by: 'Mira C.',
    size: 4,
  },
  {
    name: 'Studio Sessions',
    description: 'Headphones-on focus mix — deep concentration.',
    cover_index: 3,
    category: 'recently_played',
    created_by: 'Self',
    size: 4,
  },
  {
    name: "Today's Top Hits",
    description: "What's playing globally right now. Updated daily.",
    cover_index: 4,
    category: 'featured',
    created_by: 'Reverb Editorial',
    size: 8,
  },
  {
    name: 'Rainy Window',
    description: 'Slow-motion playlist for grey afternoons.',
    cover_index: 5,
    category: 'mood',
    created_by: 'Reverb Editorial',
    size: 5,
  },
  {
    name: 'Motion',
    description: 'Up-tempo electronic for movement.',
    cover_index: 6,
    category: 'mood',
    created_by: 'Reverb Editorial',
    size: 5,
  },
]

const RADIO_STATIONS: { name: string; description: string; cover_index: number }[] = [
  {
    name: 'Indie Folk Radio',
    description: 'Quiet songwriters and acoustic indie.',
    cover_index: 2,
  },
  {
    name: 'Late Night Electronic',
    description: 'Steady beats for the after-hours.',
    cover_index: 6,
  },
  {
    name: 'Post-Rock Cathedrals',
    description: 'Long-form instrumental crescendos.',
    cover_index: 5,
  },
  { name: 'Neo-Soul & R&B', description: 'Velvet vocals and sub-bass grooves.', cover_index: 4 },
]

interface CreatedRow {
  id: string
}

function unwrap<T>(row: { data?: T | null } | T | null): T {
  if (row && typeof row === 'object' && 'data' in (row as object)) {
    const r = row as { data?: T | null }
    if (r.data) return r.data
    throw new Error('seed: create() returned no row')
  }
  if (!row) throw new Error('seed: create() returned no row')
  return row as T
}

/**
 * Seed the global catalog (artists / albums / tracks / playlists /
 * radio stations) if the `artists` table is empty. Idempotent.
 */
export async function seedGlobalCatalogIfEmpty(): Promise<{
  artists: number
  albums: number
  tracks: number
  playlists: number
  stations: number
}> {
  const existing = await count('artists', [])
  if (existing > 0) return { artists: 0, albums: 0, tracks: 0, playlists: 0, stations: 0 }

  // Catalog rows have no real owner — leave user_id null so the rows are
  // visible to every signed-in user without ownership churn.
  const artistIds = new Map<string, string>()
  for (const a of ARTISTS) {
    const created = await create<CreatedRow>('artists', {
      name: a.name,
      slug: a.slug,
      bio: a.bio,
      avatar_url: null,
      monthly_listeners: a.monthly_listeners,
      follower_count: 0,
      created_at: new Date(),
    })
    artistIds.set(a.slug, unwrap(created).id)
  }

  const allTracks: {
    id: string
    title: string
    artist_id: string
    album_id: string
    album_title: string
    duration_seconds: number
    cover_index: number
  }[] = []
  for (const album of ALBUMS) {
    const artistId = artistIds.get(album.artist_slug)
    if (!artistId) continue
    const totalSeconds = album.tracks.reduce((s, t) => s + t.duration_seconds, 0)
    const albumRow = await create<CreatedRow>('albums', {
      artist_id: artistId,
      title: album.title,
      cover_url: null,
      release_date: new Date(album.year, 5, 1),
      type: 'album',
      description: album.description,
      label: album.label,
      cover_index: album.cover_index,
      track_count: album.tracks.length,
      duration_seconds: totalSeconds,
      created_at: new Date(),
    })
    const albumId = unwrap(albumRow).id
    let trackNumber = 1
    for (const track of album.tracks) {
      const trackRow = await create<CreatedRow>('tracks', {
        album_id: albumId,
        artist_id: artistId,
        title: track.title,
        duration_ms: track.duration_seconds * 1000,
        duration_seconds: track.duration_seconds,
        track_number: trackNumber++,
        // Stable same-site relative path; resolves to the streaming
        // route added in api/handlers/tracks.ts (returns a small WAV
        // so audio playback can be exercised in tests without an
        // external CDN).
        audio_url: null,
        cover_index: track.cover_index ?? album.cover_index,
        genre: 'indie',
        play_count: track.play_count,
        created_at: new Date(),
      })
      allTracks.push({
        id: unwrap(trackRow).id,
        title: track.title,
        artist_id: artistId,
        album_id: albumId,
        album_title: album.title,
        duration_seconds: track.duration_seconds,
        cover_index: track.cover_index ?? album.cover_index,
      })
    }
  }

  for (const playlist of PLAYLISTS) {
    const tracksToAdd = pickTracksForPlaylist(allTracks, playlist)
    const totalSeconds = tracksToAdd.reduce((s, t) => s + t.duration_seconds, 0)
    const pl = await create<CreatedRow>('playlists', {
      // user_id and owner_id are required NOT NULL — use a stable demo UUID
      // for "Reverb editorial" rows so they show up for everyone.
      user_id: '00000000-0000-0000-0000-000000000001',
      owner_id: '00000000-0000-0000-0000-000000000001',
      name: playlist.name,
      description: playlist.description,
      cover_image_url: null,
      cover_index: playlist.cover_index,
      category: playlist.category,
      created_by_name: playlist.created_by,
      is_public: true,
      track_count: tracksToAdd.length,
      duration_seconds: totalSeconds,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const playlistId = unwrap(pl).id
    let position = 1
    for (const track of tracksToAdd) {
      await create('playlist_tracks', {
        playlist_id: playlistId,
        track_id: track.id,
        position: position++,
        added_at: new Date(),
      })
    }
  }

  for (const station of RADIO_STATIONS) {
    await create('radio_stations', {
      // owner_id stays null for editorial stations — user_id is just for
      // "your saved" filtering later (we currently always show all).
      user_id: null,
      seed_track_id: allTracks[0]?.id ?? null,
      name: station.name,
      description: station.description,
      cover_index: station.cover_index,
      created_at: new Date(),
    })
  }

  return {
    artists: ARTISTS.length,
    albums: ALBUMS.length,
    tracks: allTracks.length,
    playlists: PLAYLISTS.length,
    stations: RADIO_STATIONS.length,
  }
}

function pickTracksForPlaylist(
  pool: {
    id: string
    title: string
    artist_id: string
    album_title: string
    duration_seconds: number
    cover_index: number
  }[],
  playlist: PlaylistSeed,
): {
  id: string
  title: string
  artist_id: string
  album_title: string
  duration_seconds: number
  cover_index: number
}[] {
  if (playlist.track_filters && playlist.track_filters.length > 0) {
    const wanted = pool.filter((t) =>
      playlist.track_filters!.some((filter) =>
        t.album_title.toLowerCase().includes(filter.toLowerCase()),
      ),
    )
    return wanted.slice(0, playlist.size)
  }
  // Even spread across the catalog so each playlist looks distinct.
  const stride = Math.max(1, Math.floor(pool.length / playlist.size))
  const out: typeof pool = []
  let idx = 0
  while (out.length < playlist.size && idx < pool.length) {
    out.push(pool[idx])
    idx += stride
  }
  // Backfill if stride exhausted before reaching size.
  for (const t of pool) {
    if (out.length >= playlist.size) break
    if (!out.some((o) => o.id === t.id)) out.push(t)
  }
  return out
}

const SEED_NOTIFICATIONS = [
  {
    kind: 'system_message',
    title: 'Welcome to Reverb',
    body: 'Follow some artists to start getting personalized picks.',
    href: '/search',
    age_hours: 0.1,
  },
  {
    kind: 'new_release',
    title: 'Tessa Mira just released "Cardinal"',
    body: 'New single from "Hello, Stranger" — listen now.',
    href: '/library/liked',
    age_hours: 4,
  },
  {
    kind: 'playlist_update',
    title: 'Discover Weekly refreshed',
    body: '30 fresh tracks. Tap play to dive in.',
    href: '/library',
    age_hours: 18,
  },
  {
    kind: 'concert',
    title: 'Helio Brace tickets — Brooklyn',
    body: 'May 18 at Brooklyn Steel. Tickets on sale Friday.',
    href: '/library',
    age_hours: 38,
  },
  {
    kind: 'recap',
    title: 'Your week in music',
    body: 'Top genre: indie pop. Top artist: Tessa Mira. 14 hours played.',
    href: '/library',
    age_hours: 96,
  },
] as const

/**
 * Seed a freshly signed-up user with a couple of liked tracks, one
 * saved playlist, and the welcome notifications. Idempotent: skips if
 * the user already has any notifications row.
 */
export async function seedDemoForUser(userId: string): Promise<{
  notifications: number
  liked_tracks: number
  saved_playlists: number
}> {
  if (!userId) return { notifications: 0, liked_tracks: 0, saved_playlists: 0 }
  const existing = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existing > 0) return { notifications: 0, liked_tracks: 0, saved_playlists: 0 }

  // Notifications
  let notificationsCreated = 0
  for (const n of SEED_NOTIFICATIONS) {
    await create('notifications', {
      user_id: userId,
      kind: n.kind,
      title: n.title,
      body: n.body,
      href: n.href,
      payload: { title: n.title, body: n.body, href: n.href },
      read_at: null,
      created_at: new Date(Date.now() - n.age_hours * 60 * 60 * 1000),
    })
    notificationsCreated++
  }

  // Like the first 3 tracks for variety on Liked Songs
  const seedTracks = await findMany<{ id: string }>('tracks', { limit: 3 })
  let likedCreated = 0
  for (const tr of seedTracks) {
    try {
      await create('liked_tracks', {
        user_id: userId,
        track_id: tr.id,
        liked_at: new Date(),
      })
      likedCreated++
    } catch (_error) {
      // unique-constraint racing — safe to ignore, row already exists
    }
  }

  // Save the first playlist so Library shows the Saved section
  const firstPlaylist = await findOne<{ id: string }>('playlists', [
    { field: 'is_public', operator: '=', value: true },
  ])
  let savedCreated = 0
  if (firstPlaylist) {
    try {
      await create('playlist_saves', {
        user_id: userId,
        playlist_id: firstPlaylist.id,
        saved_at: new Date(),
      })
      savedCreated = 1
    } catch (_error) {
      // unique-constraint race — playlist_save already exists, safe to ignore
    }
  }

  // Initial preferences row so Settings has a baseline to PATCH
  try {
    await create('user_preferences', {
      user_id: userId,
      audio_quality: 'lossless',
      crossfade: true,
      gapless: true,
      normalize: true,
      allow_explicit: true,
      public_profile: true,
      public_listening: false,
      allow_followers: true,
      share_listening: false,
      notify_new_releases: true,
      notify_weekly_recap: true,
      notify_follower_activity: false,
      notify_concert_nearby: true,
      updated_at: new Date(),
    })
  } catch (_error) {
    // Already exists (race) — user_preferences row is idempotent, safe to ignore
  }

  return {
    notifications: notificationsCreated,
    liked_tracks: likedCreated,
    saved_playlists: savedCreated,
  }
}
