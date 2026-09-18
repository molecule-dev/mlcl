import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

// --- Schemas ---

const ALLOWED_KINDS = ['image', 'svg', 'video', 'audio', 'font'] as const

const listQuerySchema = z.object({
  kind: z.enum(ALLOWED_KINDS).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(100),
})

const createAssetSchema = z.object({
  name: z.string().min(1).max(200),
  kind: z.enum(ALLOWED_KINDS).default('svg'),
  url: z.string().min(1).max(2048),
  sizeBytes: z.coerce.number().int().nonnegative().optional(),
})

const summaryQuerySchema = z.object({})

// --- Helpers ---

// --- Routes ---

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { kind, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (kind) where.push({ field: 'kind', operator: '=', value: kind })
    const assets = await findMany('assets', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(assets)
  } catch (error) {
    logger.error('GET /api/assets failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/summary', validateQuery(summaryQuerySchema), async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const ownerWhere: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    const total = await count('assets', ownerWhere)
    const counts: Record<(typeof ALLOWED_KINDS)[number], number> = {
      image: 0,
      svg: 0,
      video: 0,
      audio: 0,
      font: 0,
    }
    let totalSize = 0
    for (const kind of ALLOWED_KINDS) {
      counts[kind] = await count('assets', [
        ...ownerWhere,
        { field: 'kind', operator: '=', value: kind },
      ])
    }
    const allAssets = await findMany<Record<string, unknown>>('assets', {
      where: ownerWhere,
      limit: 1000,
    })
    for (const asset of allAssets) {
      totalSize += Number(asset.size_bytes ?? 0)
    }
    res.json({
      total,
      totalSizeBytes: totalSize,
      counts,
    })
  } catch (error) {
    logger.error('GET /api/assets/summary failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const asset = await findById<Record<string, unknown>>('assets', getParamId(req))
    if (!asset || asset.owner_id !== userId) {
      res.status(404).json({ error: t('assets.notFound', {}, { defaultValue: 'Asset not found' }) })
      return
    }
    res.json(asset)
  } catch (error) {
    logger.error('GET /api/assets/:id failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createAssetSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createAssetSchema>
    const result = await create('assets', {
      owner_id: userId,
      kind: body.kind,
      url: body.url,
      name: body.name,
      size_bytes: body.sizeBytes ?? 0,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('POST /api/assets failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('assets', id)
    if (!existing || existing.owner_id !== userId) {
      res.status(404).json({ error: t('assets.notFound', {}, { defaultValue: 'Asset not found' }) })
      return
    }
    await deleteById('assets', id)
    res.status(204).end()
  } catch (error) {
    logger.error('DELETE /api/assets/:id failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
