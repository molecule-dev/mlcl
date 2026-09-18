import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  query,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { PhotoSharingLimits } from '../tiers.js'

const router = Router()

interface DbAlbum extends Record<string, unknown> {
  id: string
  owner_id: string
  title: string
  description: string | null
  cover_photo_id: string | null
  photo_count: number
  visibility: 'public' | 'unlisted' | 'private'
  created_at: Date | string
  updated_at: Date | string
}

interface DbPhoto extends Record<string, unknown> {
  id: string
  album_id: string | null
  tags: unknown
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

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

const visibilitySchema = z.enum(['public', 'unlisted', 'private'])

const createAlbumSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  cover_photo_id: z.string().uuid().nullable().optional(),
  visibility: visibilitySchema.optional(),
})

const updateAlbumSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  cover_photo_id: z.string().uuid().nullable().optional(),
  visibility: visibilitySchema.optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  const { owner, page = 1, limit = 20 } = req.query as Record<string, string | undefined>
  const where: WhereCondition[] = []
  if (owner === 'me') {
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    where.push({ field: 'owner_id', operator: '=', value: userId })
  } else if (owner) {
    where.push({ field: 'owner_id', operator: '=', value: owner })
    where.push({ field: 'visibility', operator: '=', value: 'public' })
  } else if (userId) {
    where.push({ field: 'owner_id', operator: '=', value: userId })
  } else {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }

  const albums = await findMany<DbAlbum>('albums', {
    where,
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
    orderBy: [{ field: 'updated_at', direction: 'desc' }],
  })
  res.json(albums)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  const id = getParamId(req)
  if (!isUuid(id)) {
    res.status(404).json({ error: t('albums.notFound', {}, { defaultValue: 'Album not found' }) })
    return
  }
  const album = await findById<DbAlbum>('albums', id)
  if (!album) {
    res.status(404).json({ error: t('albums.notFound', {}, { defaultValue: 'Album not found' }) })
    return
  }
  const visibility = album.visibility
  const ownerId = album.owner_id
  if (visibility === 'private' && ownerId !== userId) {
    res.status(404).json({ error: t('albums.notFound', {}, { defaultValue: 'Album not found' }) })
    return
  }

  // A public/unlisted album is readable by non-owners, but each photo carries its own
  // `visibility` — a `private` photo inside such an album must stay owner-only, exactly like
  // every other read path (feed, single-photo, favorites, profile, galleries). Gate the album's
  // photos the same way favorites does; recompute `photo_count` so the header can't advertise
  // (or leak the existence of) photos the viewer can't see.
  const photoRows = await query<DbPhoto>(
    `SELECT * FROM photos WHERE album_id = $1 AND (visibility != 'private' OR owner_id = $2) ORDER BY uploaded_at DESC`,
    [id, userId ?? null],
  )
  const photos = photoRows.rows.map((p) => ({ ...p, tags: normalizeTags(p.tags) }))

  res.json({ ...album, photo_count: photos.length, photos })
})

router.post(
  '/',
  enforceLimit<PhotoSharingLimits>({
    limitType: 'maxAlbums',
    getLimit: (limits) => limits.maxAlbums,
    getCurrent: async (userId) =>
      count('albums', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createAlbumSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { title, description, cover_photo_id, visibility } = req.body as z.infer<
      typeof createAlbumSchema
    >

    const result = await create<DbAlbum>('albums', {
      title,
      description: description ?? null,
      owner_id: userId,
      cover_photo_id: cover_photo_id ?? null,
      photo_count: 0,
      visibility: visibility ?? 'public',
      created_at: new Date(),
      updated_at: new Date(),
    })
    const created = (result as { data?: DbAlbum }).data ?? (result as unknown as DbAlbum)
    res.status(201).json(created)
  },
)

router.put('/:id', validateBody(updateAlbumSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  if (!isUuid(id)) {
    res.status(404).json({ error: t('albums.notFound', {}, { defaultValue: 'Album not found' }) })
    return
  }
  const existing = await findById<DbAlbum>('albums', id)
  if (!existing || existing.owner_id !== userId) {
    res.status(404).json({ error: t('albums.notFound', {}, { defaultValue: 'Album not found' }) })
    return
  }
  const body = req.body as z.infer<typeof updateAlbumSchema>
  const updates: Record<string, unknown> = { updated_at: new Date() }
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.cover_photo_id !== undefined) updates.cover_photo_id = body.cover_photo_id
  if (body.visibility !== undefined) updates.visibility = body.visibility

  const result = await updateById<DbAlbum>('albums', id, updates)
  const updated = (result as { data?: DbAlbum }).data ?? (result as unknown as DbAlbum)
  res.json(updated)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  if (!isUuid(id)) {
    res.status(404).json({ error: t('albums.notFound', {}, { defaultValue: 'Album not found' }) })
    return
  }
  const existing = await findById<DbAlbum>('albums', id)
  if (!existing || existing.owner_id !== userId) {
    res.status(404).json({ error: t('albums.notFound', {}, { defaultValue: 'Album not found' }) })
    return
  }

  await query(`UPDATE photos SET album_id = NULL WHERE album_id = $1`, [id])
  await deleteById('albums', id)
  res.status(204).end()
})

export default router
