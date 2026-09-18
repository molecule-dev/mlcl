import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  query,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { getProvider as getUploads } from '@molecule/api-uploads'

import type { PhotoSharingLimits } from '../tiers.js'

const router = Router()

interface DbPhoto extends Record<string, unknown> {
  id: string
  owner_id: string
  album_id: string | null
  title: string | null
  description: string | null
  caption: string | null
  original_url: string
  large_url: string
  thumbnail_url: string
  width: number | null
  height: number | null
  exif_data: Record<string, unknown> | null
  tags: unknown
  visibility: 'public' | 'unlisted' | 'private'
  view_count: number
  favorite_count: number
  comment_count: number
  uploaded_at: Date | string
  owner_name?: string | null
  owner_username?: string | null
  owner_oauth_data?: Record<string, unknown> | null
}

const PUBLIC_PREF_KEYS = ['showExif', 'showLocation', 'allowDownload', 'watermarkLarge'] as const

/**
 * Pull only the photo-display preferences out of the owner's
 * `oauthData.photoPrefs` blob. Anything else (notification toggles,
 * profile metadata, etc.) stays private.
 */
function pickPhotoPrefs(
  oauthData: Record<string, unknown> | null | undefined,
): Record<string, boolean> | null {
  if (!oauthData || typeof oauthData !== 'object') return null
  const raw = (oauthData as Record<string, unknown>).photoPrefs
  if (!raw || typeof raw !== 'object') return null
  const out: Record<string, boolean> = {}
  for (const key of PUBLIC_PREF_KEYS) {
    const v = (raw as Record<string, unknown>)[key]
    if (typeof v === 'boolean') out[key] = v
  }
  return Object.keys(out).length > 0 ? out : null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

const PHOTO_FILE_PREFIX = '/api/photo-files/'
/**
 * Extract the uploads storage key from a stored photo URL. The upload route
 * hands back `/api/photo-files/<storageKey>` proxy URLs (see uploads.ts), so the
 * key is the trailing path segment. Returns null for any URL that isn't such a
 * proxied storage reference (external/absolute URLs are left untouched).
 */
function storageKeyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const idx = url.indexOf(PHOTO_FILE_PREFIX)
  if (idx === -1) return null
  const key = url.slice(idx + PHOTO_FILE_PREFIX.length).split(/[?#]/)[0]
  return key || null
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') {
    if (!value) return []
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

function shapePhoto(row: DbPhoto, opts: { favorited?: boolean } = {}): Record<string, unknown> {
  const tags = normalizeTags(row.tags)
  return {
    id: row.id,
    owner_id: row.owner_id,
    album_id: row.album_id,
    title: row.title,
    description: row.description,
    caption: row.caption,
    original_url: row.original_url,
    large_url: row.large_url,
    thumbnail_url: row.thumbnail_url,
    width: row.width,
    height: row.height,
    exif_data: row.exif_data ?? null,
    tags,
    visibility: row.visibility,
    view_count: row.view_count,
    favorite_count: row.favorite_count,
    comment_count: row.comment_count,
    uploaded_at: row.uploaded_at,
    owner: row.owner_name
      ? { id: row.owner_id, name: row.owner_name, username: row.owner_username }
      : undefined,
    owner_prefs: pickPhotoPrefs(row.owner_oauth_data ?? null),
    favorited: opts.favorited ?? undefined,
  }
}

const visibilitySchema = z.enum(['public', 'unlisted', 'private'])

const createPhotoSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  caption: z.string().max(2000).optional(),
  image: z.string().optional(),
  original_url: z.string().min(1),
  large_url: z.string().optional(),
  thumbnail_url: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  exif_data: z.record(z.string(), z.unknown()).optional(),
  album_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
  visibility: visibilitySchema.optional(),
})

const updatePhotoSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  caption: z.string().max(2000).optional(),
  album_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
  visibility: visibilitySchema.optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  const { page = 1, limit = 30, tag, owner } = req.query as Record<string, string | undefined>
  const limitN = Math.min(Math.max(Number(limit) || 30, 1), 100)
  const pageN = Math.max(Number(page) || 1, 1)
  const offset = (pageN - 1) * limitN

  const params: unknown[] = []
  const wheres: string[] = []

  if (owner === 'me') {
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    params.push(userId)
    wheres.push(`p.owner_id = $${params.length}`)
  } else if (owner) {
    params.push(owner)
    wheres.push(`p.owner_id = $${params.length}`)
    wheres.push(`p.visibility = 'public'`)
  } else {
    wheres.push(`p.visibility = 'public'`)
  }

  if (tag) {
    params.push(tag)
    wheres.push(`p.tags @> jsonb_build_array($${params.length}::text)`)
  }

  const whereClause = wheres.length ? `WHERE ${wheres.join(' AND ')}` : ''
  params.push(limitN)
  params.push(offset)
  const limitParam = `$${params.length - 1}`
  const offsetParam = `$${params.length}`

  const sql = `
    SELECT p.*, u.name AS owner_name, u.username AS owner_username,
           u."oauthData" AS owner_oauth_data
    FROM photos p
    LEFT JOIN users u ON u.id = p.owner_id
    ${whereClause}
    ORDER BY p.uploaded_at DESC
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `
  const result = await query<DbPhoto>(sql, params)
  const photos = result.rows.map((row) => shapePhoto(row))
  res.json(photos)
})

router.get('/favorites', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const sql = `
    SELECT p.*, u.name AS owner_name, u.username AS owner_username,
           u."oauthData" AS owner_oauth_data
    FROM favorites f
    INNER JOIN photos p ON p.id = f.photo_id
    LEFT JOIN users u ON u.id = p.owner_id
    WHERE f.user_id = $1
      AND (p.visibility != 'private' OR p.owner_id = $1)
    ORDER BY f.created_at DESC
  `
  const result = await query<DbPhoto>(sql, [userId])
  const photos = result.rows.map((row) => shapePhoto(row, { favorited: true }))
  res.json(photos)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  const id = getParamId(req)
  if (!isUuid(id)) {
    res.status(404).json({ error: t('photos.notFound', {}, { defaultValue: 'Photo not found' }) })
    return
  }
  const sql = `
    SELECT p.*, u.name AS owner_name, u.username AS owner_username,
           u."oauthData" AS owner_oauth_data
    FROM photos p
    LEFT JOIN users u ON u.id = p.owner_id
    WHERE p.id = $1
    LIMIT 1
  `
  const result = await query<DbPhoto>(sql, [id])
  const photo = result.rows[0]
  if (!photo) {
    res.status(404).json({ error: t('photos.notFound', {}, { defaultValue: 'Photo not found' }) })
    return
  }
  if (photo.visibility === 'private' && photo.owner_id !== userId) {
    res.status(404).json({ error: t('photos.notFound', {}, { defaultValue: 'Photo not found' }) })
    return
  }
  await updateById('photos', id, { view_count: (photo.view_count ?? 0) + 1 })

  let favorited = false
  if (userId) {
    const fav = await findOne<Record<string, unknown>>('favorites', [
      { field: 'photo_id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    favorited = !!fav
  }
  res.json(shapePhoto(photo, { favorited }))
})

router.post(
  '/',
  enforceLimit<PhotoSharingLimits>({
    limitType: 'maxPhotos',
    getLimit: (limits) => limits.maxPhotos,
    getCurrent: async (userId) =>
      count('photos', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createPhotoSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    const {
      title,
      description,
      caption,
      original_url,
      large_url,
      thumbnail_url,
      width,
      height,
      exif_data,
      album_id,
      tags,
      visibility,
    } = req.body as z.infer<typeof createPhotoSchema>

    const result = await create<DbPhoto>('photos', {
      title: title ?? null,
      description: description ?? null,
      caption: caption ?? null,
      original_url,
      large_url: large_url ?? original_url,
      thumbnail_url: thumbnail_url ?? original_url,
      width: width ?? null,
      height: height ?? null,
      exif_data: exif_data ?? null,
      owner_id: userId,
      album_id: album_id ?? null,
      tags: JSON.stringify(tags ?? []),
      visibility: visibility ?? 'public',
      view_count: 0,
      favorite_count: 0,
      comment_count: 0,
      uploaded_at: new Date(),
    })

    if (album_id) {
      await query(
        `UPDATE albums SET photo_count = (SELECT COUNT(*) FROM photos WHERE album_id = $1), updated_at = now() WHERE id = $1`,
        [album_id],
      )
    }

    const created = (result as { data?: DbPhoto }).data ?? (result as unknown as DbPhoto)
    res.status(201).json(shapePhoto(created))
  },
)

router.put('/:id', validateBody(updatePhotoSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  if (!isUuid(id)) {
    res.status(404).json({ error: t('photos.notFound', {}, { defaultValue: 'Photo not found' }) })
    return
  }
  const existing = await findById<DbPhoto>('photos', id)
  if (!existing || existing.owner_id !== userId) {
    res.status(404).json({ error: t('photos.notFound', {}, { defaultValue: 'Photo not found' }) })
    return
  }
  const body = req.body as z.infer<typeof updatePhotoSchema>
  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.caption !== undefined) updates.caption = body.caption
  if (body.album_id !== undefined) updates.album_id = body.album_id
  if (body.tags !== undefined) updates.tags = JSON.stringify(body.tags)
  if (body.visibility !== undefined) updates.visibility = body.visibility

  const result = await updateById<DbPhoto>('photos', id, updates)
  const updated = (result as { data?: DbPhoto }).data ?? (result as unknown as DbPhoto)
  res.json(shapePhoto(updated))
})

router.post('/:id/favorite', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  if (!isUuid(id)) {
    res.status(404).json({ error: t('photos.notFound', {}, { defaultValue: 'Photo not found' }) })
    return
  }
  const photo = await findById<DbPhoto>('photos', id)
  if (!photo) {
    res.status(404).json({ error: t('photos.notFound', {}, { defaultValue: 'Photo not found' }) })
    return
  }

  const existing = await findOne<Record<string, unknown>>('favorites', [
    { field: 'photo_id', operator: '=', value: id },
    { field: 'user_id', operator: '=', value: userId },
  ])

  if (existing) {
    await deleteById('favorites', existing.id as string)
    const recount = await count('favorites', [{ field: 'photo_id', operator: '=', value: id }])
    await updateById('photos', id, { favorite_count: recount })
    res.json({ favorited: false, favorite_count: recount })
    return
  }
  await create('favorites', {
    photo_id: id,
    user_id: userId,
    created_at: new Date(),
  })
  const recount = await count('favorites', [{ field: 'photo_id', operator: '=', value: id }])
  await updateById('photos', id, { favorite_count: recount })
  res.json({ favorited: true, favorite_count: recount })
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  if (!isUuid(id)) {
    res.status(404).json({ error: t('photos.notFound', {}, { defaultValue: 'Photo not found' }) })
    return
  }
  const existing = await findById<DbPhoto>('photos', id)
  if (!existing || existing.owner_id !== userId) {
    res.status(404).json({ error: t('photos.notFound', {}, { defaultValue: 'Photo not found' }) })
    return
  }

  await query(`DELETE FROM favorites WHERE photo_id = $1`, [id])
  await query(`DELETE FROM album_photos WHERE photo_id = $1`, [id])
  await deleteById('photos', id)

  // Best-effort blob cleanup: remove the backing S3 object(s) so a deleted photo doesn't orphan
  // its storage (up to 25 MB each — an unbounded leak otherwise). A photo can reuse one key
  // across all three sizes (large_url/thumbnail_url default to original_url), so dedupe. Done
  // AFTER the row delete (the source of truth) and never fatal — a storage hiccup must not fail
  // the delete or leave a row pointing at a gone blob.
  const keys = new Set(
    [existing.original_url, existing.large_url, existing.thumbnail_url]
      .map(storageKeyFromUrl)
      .filter((k): k is string => k !== null),
  )
  if (keys.size > 0) {
    try {
      const uploads = getUploads()
      await Promise.all([...keys].map((key) => uploads.deleteFile(key)))
    } catch (err) {
      logger.error('photos.delete: blob cleanup failed', { id, err })
    }
  }

  if (existing.album_id) {
    await query(
      `UPDATE albums SET photo_count = (SELECT COUNT(*) FROM photos WHERE album_id = $1), updated_at = now() WHERE id = $1`,
      [existing.album_id],
    )
  }
  res.status(204).end()
})

// Backwards-compat: old route shape returning user's favorites list.
router.get('/:id/favorites', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const favorites = await findMany('favorites', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })
  res.json(favorites)
})

export default router
