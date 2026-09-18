/**
 * Assets handler — user uploads (video / audio / image / font) browseable
 * from the AssetLibrary page and droppable into the Editor.
 *
 * Authorization: assets are owner-scoped via `owner_id`. Public assets
 * (`is_public = true`) may be read by any authenticated user; mutations
 * are owner-only.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { requireAssetAccess, requireAssetOwner } from '../lib/authz.js'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  kind: z.enum(['video', 'audio', 'image', 'font']).optional().default('video'),
  source_url: z.string().min(1).max(2_000),
  thumbnail_url: z.string().max(2_000).optional(),
  duration_ms: z.number().int().min(0).optional().default(0),
  width: z.number().int().min(0).optional(),
  height: z.number().int().min(0).optional(),
  size_bytes: z.number().int().min(0).optional().default(0),
  is_public: z.boolean().optional().default(false),
})

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  thumbnail_url: z.string().max(2_000).nullable().optional(),
  is_public: z.boolean().optional(),
})

const router = Router()

router.use(requireAuth)

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const where: Array<{ field: string; operator: '='; value: unknown }> = [
      { field: 'owner_id', operator: '=', value: userId },
    ]
    if (req.query.kind) {
      where.push({ field: 'kind', operator: '=', value: String(req.query.kind) })
    }
    const assets = await findMany('assets', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 500,
    })
    res.json(assets)
  } catch (error) {
    logger.error('assets.list', error)
    res.status(500).json({
      error: t('assets.listError', undefined, { defaultValue: 'Failed to list assets' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireAssetAccess(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('assets.notFound', undefined, { defaultValue: 'Asset not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (error) {
    logger.error('assets.read', error)
    res.status(500).json({
      error: t('assets.readError', undefined, { defaultValue: 'Failed to read asset' }),
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const result = await create('assets', {
      owner_id: userId,
      name: parsed.data.name,
      kind: parsed.data.kind ?? 'video',
      source_url: parsed.data.source_url,
      thumbnail_url: parsed.data.thumbnail_url ?? null,
      duration_ms: parsed.data.duration_ms ?? 0,
      width: parsed.data.width ?? null,
      height: parsed.data.height ?? null,
      size_bytes: parsed.data.size_bytes ?? 0,
      is_public: parsed.data.is_public ?? false,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('assets.create', error)
    res.status(500).json({
      error: t('assets.createError', undefined, { defaultValue: 'Failed to create asset' }),
    })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const check = await requireAssetOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('assets.notFound', undefined, { defaultValue: 'Asset not found' }),
      })
      return
    }
    const result = await updateById('assets', req.params.id as string, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('assets.update', error)
    res.status(500).json({
      error: t('assets.updateError', undefined, { defaultValue: 'Failed to update asset' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireAssetOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('assets.notFound', undefined, { defaultValue: 'Asset not found' }),
      })
      return
    }
    await deleteById('assets', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('assets.delete', error)
    res.status(500).json({
      error: t('assets.deleteError', undefined, { defaultValue: 'Failed to delete asset' }),
    })
  }
})

export default router
