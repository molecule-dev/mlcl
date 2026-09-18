import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const ALLOWED_SOURCE_KINDS = ['upload', 'url', 'notion', 'confluence', 'gdrive'] as const

const ALLOWED_SYNC_STATUSES = ['idle', 'pending', 'syncing', 'failed', 'ready'] as const

const createSourceSchema = z.object({
  kind: z.enum(ALLOWED_SOURCE_KINDS),
  label: z.string().min(1),
  collection_id: z.string().uuid().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  source_url: z.string().url().optional(),
})

const updateSourceSchema = z.object({
  label: z.string().min(1).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  sync_status: z.enum(ALLOWED_SYNC_STATUSES).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const rows = await findMany('sources', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(rows)
  } catch (error) {
    logger.error('sources.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const row = await findById<Record<string, unknown>>('sources', id)
    if (!row || row.user_id !== userId) {
      return res.status(404).json({
        error: t('sources.notFound', undefined, { defaultValue: 'Source not found.' }),
      })
    }
    res.json(row)
  } catch (error) {
    logger.error('sources.getById', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/', validateBody(createSourceSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const body = req.body as z.infer<typeof createSourceSchema>
    const cfg: Record<string, unknown> = { ...(body.config ?? {}) }
    if (body.source_url) cfg.source_url = body.source_url
    const result = await create('sources', {
      user_id: userId,
      collection_id: body.collection_id ?? null,
      kind: body.kind,
      label: body.label,
      config_json: JSON.stringify(cfg),
      sync_status: 'idle',
      created_at: new Date(),
    })
    res.status(201).json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('sources.create', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.put('/:id', validateBody(updateSourceSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('sources', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('sources.notFound', undefined, { defaultValue: 'Source not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateSourceSchema>
    const updates: Record<string, unknown> = {}
    if (body.label !== undefined) updates.label = body.label
    if (body.sync_status !== undefined) updates.sync_status = body.sync_status
    if (body.config !== undefined) updates.config_json = JSON.stringify(body.config)
    const result = await updateById('sources', id, updates)
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('sources.update', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('sources', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('sources.notFound', undefined, { defaultValue: 'Source not found.' }),
      })
    }
    await deleteById('sources', id)
    res.status(204).end()
  } catch (error) {
    logger.error('sources.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
