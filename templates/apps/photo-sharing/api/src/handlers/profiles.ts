/**
 * Public photographer profile lookup by handle (username) or id.
 *
 * Returns a public-safe view of the user (no email, no oauth tokens),
 * their public+unlisted photo count, public albums, and a sampling of
 * their most-recent public photos. Honours `oauthData.photoPrefs.publicProfile`:
 * when false, returns 404 to avoid leaking that the handle exists.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { count, findById, findMany, findOne, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface DbUser extends Record<string, unknown> {
  id: string
  name: string | null
  username: string | null
  oauthData: Record<string, unknown> | null
  createdAt: Date | string
}

interface DbPhotoRow extends Record<string, unknown> {
  id: string
  owner_id: string
  album_id: string | null
  title: string | null
  caption: string | null
  description: string | null
  original_url: string
  large_url: string
  thumbnail_url: string
  width: number | null
  height: number | null
  exif_data: Record<string, unknown> | null
  tags: unknown
  visibility: string
  view_count: number
  favorite_count: number
  comment_count: number
  uploaded_at: Date | string
}

interface DbAlbumRow extends Record<string, unknown> {
  id: string
  owner_id: string
  title: string
  description: string | null
  cover_photo_id: string | null
  photo_count: number
  visibility: string
  created_at: Date | string
  updated_at: Date | string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string' && value) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch (_error) {
      // Not valid JSON — fall back to comma-separated parsing
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return []
}

function isPublicProfile(user: DbUser): boolean {
  const oauth = user.oauthData as { photoPrefs?: { publicProfile?: boolean } } | null
  // Default is public when the user hasn't opted out — same default the
  // settings page renders.
  return oauth?.photoPrefs?.publicProfile !== false
}

router.get('/:handle', async (req: Request, res: Response) => {
  const handle = String(req.params.handle ?? '').trim()
  if (!handle) {
    res
      .status(404)
      .json({ error: t('profiles.notFound', {}, { defaultValue: 'Profile not found' }) })
    return
  }

  const user = UUID_RE.test(handle)
    ? await findById<DbUser>('users', handle)
    : await findOne<DbUser>('users', [{ field: 'username', operator: '=', value: handle }])

  if (!user || !isPublicProfile(user)) {
    res
      .status(404)
      .json({ error: t('profiles.notFound', {}, { defaultValue: 'Profile not found' }) })
    return
  }

  const ownerOauth = (user.oauthData ?? {}) as { photoPrefs?: Record<string, unknown> }
  const prefs = (ownerOauth.photoPrefs ?? {}) as Record<string, unknown>

  const photoCount = await count('photos', [
    { field: 'owner_id', operator: '=', value: user.id },
    { field: 'visibility', operator: '!=', value: 'private' },
  ])

  const albumRows = await findMany<DbAlbumRow>('albums', {
    where: [
      { field: 'owner_id', operator: '=', value: user.id },
      { field: 'visibility', operator: '=', value: 'public' },
    ],
    orderBy: [{ field: 'updated_at', direction: 'desc' }],
    limit: 24,
  })

  const photoRows = await query<DbPhotoRow>(
    `SELECT * FROM photos
     WHERE owner_id = $1 AND visibility != 'private'
     ORDER BY uploaded_at DESC
     LIMIT 60`,
    [user.id],
  )

  const totals = await query<{ favorite_count: string | number; view_count: string | number }>(
    `SELECT COALESCE(SUM(favorite_count), 0) AS favorite_count,
            COALESCE(SUM(view_count), 0) AS view_count
     FROM photos
     WHERE owner_id = $1 AND visibility != 'private'`,
    [user.id],
  )
  const totalRow = totals.rows[0] ?? { favorite_count: 0, view_count: 0 }

  res.json({
    handle: user.username ?? user.id,
    id: user.id,
    name: user.name,
    username: user.username,
    bio: typeof prefs.bio === 'string' ? prefs.bio : null,
    location: typeof prefs.location === 'string' ? prefs.location : null,
    photo_count: photoCount,
    album_count: albumRows.length,
    favorites_received: Number(totalRow.favorite_count) || 0,
    views_received: Number(totalRow.view_count) || 0,
    joined_at: user.createdAt ?? null,
    photos: photoRows.rows.map((row) => ({
      id: row.id,
      owner_id: row.owner_id,
      album_id: row.album_id,
      title: row.title,
      caption: row.caption,
      description: row.description,
      original_url: row.original_url,
      large_url: row.large_url,
      thumbnail_url: row.thumbnail_url,
      width: row.width,
      height: row.height,
      exif_data: row.exif_data,
      tags: normalizeTags(row.tags),
      visibility: row.visibility,
      view_count: row.view_count,
      favorite_count: row.favorite_count,
      comment_count: row.comment_count,
      uploaded_at: row.uploaded_at,
    })),
    albums: albumRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      cover_photo_id: row.cover_photo_id,
      photo_count: row.photo_count,
      updated_at: row.updated_at,
    })),
  })
})

export default router
