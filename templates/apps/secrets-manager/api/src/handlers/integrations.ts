import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { encrypt } from '@molecule/api-encryption'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const paramId = (req: Request): string => {
  const id = req.params.id
  return Array.isArray(id) ? id[0] : id
}

const CATEGORY = z.enum(['doppler', 'aws', 'gcp', 'azure', 'vercel'])

const createIntegrationSchema = z.object({
  name: z.string().min(1).max(120),
  category: CATEGORY,
  config: z.record(z.string(), z.unknown()).default({}),
})

const updateIntegrationSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['connected', 'disconnected', 'error']).optional(),
})

router.get('/integrations', async (_req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const rows = await findMany<Record<string, unknown>>('integrations', {
      where: [{ field: 'user_id', operator: '=', value: uid }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(rows.map((r) => ({ ...r, config: undefined })))
  } catch (err) {
    logger.error(`integrations.list failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/integrations/:id', async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = paramId(req)
    const row = await findById<Record<string, unknown>>('integrations', id)
    if (!row || row.user_id !== uid) {
      return res.status(404).json({
        error: t('integrations.notFound', undefined, { defaultValue: 'Integration not found' }),
      })
    }
    res.json({ ...row, config: undefined })
  } catch (err) {
    logger.error(`integrations.get failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/integrations',
  validateBody(createIntegrationSchema),
  async (req: Request, res: Response) => {
    try {
      const uid = getUserId(res)
      if (!uid)
        return res
          .status(401)
          .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

      const body = req.body as z.infer<typeof createIntegrationSchema>
      const ciphertext = await encrypt(JSON.stringify(body.config))
      const result = await create<Record<string, unknown>>('integrations', {
        user_id: uid,
        name: body.name,
        category: body.category,
        config: ciphertext,
        status: 'disconnected',
      })
      const created = result.data as Record<string, unknown> | null
      res.status(201).json({ ...(created ?? {}), config: undefined })
    } catch (err) {
      logger.error(`integrations.create failed: ${(err as Error)?.stack ?? err}`)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put(
  '/integrations/:id',
  validateBody(updateIntegrationSchema),
  async (req: Request, res: Response) => {
    try {
      const uid = getUserId(res)
      if (!uid)
        return res
          .status(401)
          .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

      const id = paramId(req)
      const existing = await findById<Record<string, unknown>>('integrations', id)
      if (!existing || existing.user_id !== uid) {
        return res.status(404).json({
          error: t('integrations.notFound', undefined, { defaultValue: 'Integration not found' }),
        })
      }

      const body = req.body as z.infer<typeof updateIntegrationSchema>
      const updates: Record<string, unknown> = {}
      if (body.name !== undefined) updates.name = body.name
      if (body.config !== undefined) updates.config = await encrypt(JSON.stringify(body.config))
      if (body.status !== undefined) updates.status = body.status
      updates.updated_at = new Date()

      const result = await updateById<Record<string, unknown>>('integrations', id, updates)
      const updated = result.data as Record<string, unknown> | null
      res.json({ ...(updated ?? {}), config: undefined })
    } catch (err) {
      logger.error(`integrations.update failed: ${(err as Error)?.stack ?? err}`)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post('/integrations/:id/sync', async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = paramId(req)
    const existing = await findById<Record<string, unknown>>('integrations', id)
    if (!existing || existing.user_id !== uid) {
      return res.status(404).json({
        error: t('integrations.notFound', undefined, { defaultValue: 'Integration not found' }),
      })
    }
    const result = await updateById<Record<string, unknown>>('integrations', id, {
      last_sync: new Date(),
      status: 'connected',
    })
    const updated = result.data as Record<string, unknown> | null
    res.json({ ...(updated ?? {}), config: undefined })
  } catch (err) {
    logger.error(`integrations.sync failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/integrations/:id', async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = paramId(req)
    const existing = await findById<Record<string, unknown>>('integrations', id)
    if (!existing || existing.user_id !== uid) {
      return res.status(404).json({
        error: t('integrations.notFound', undefined, { defaultValue: 'Integration not found' }),
      })
    }
    await deleteById('integrations', id)
    res.status(204).end()
  } catch (err) {
    logger.error(`integrations.delete failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
