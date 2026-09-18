/**
 * Outgoing webhooks handler — user-managed delivery destinations
 * (Slack, PagerDuty, etc.) shown in Settings → Webhooks. We only persist
 * the destination URL + filter events + active flag here; the actual
 * delivery is up to the runner/notification subsystem.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createSchema = z.object({
  name: z.string().max(255).optional().default(''),
  url: z.string().url(),
  events: z.array(z.string()).optional().default([]),
  active: z.boolean().optional().default(true),
  repository_id: z.string().optional(),
})

const updateSchema = z.object({
  name: z.string().max(255).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  active: z.boolean().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const items = await findMany<Record<string, unknown>>('outgoing_webhooks', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(items)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const body = req.body as z.infer<typeof createSchema>
    const created = await create('outgoing_webhooks', {
      user_id: userId,
      repository_id: body.repository_id ?? null,
      name: body.name,
      url: body.url,
      events: JSON.stringify(body.events ?? []),
      active: body.active ?? true,
      last_delivery_at: null,
      last_delivery_status: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(created.data ?? created)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('outgoing_webhooks', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('webhooks.notFound', {}, { defaultValue: 'Webhook not found' }) })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.name != null) updates.name = body.name
    if (body.url != null) updates.url = body.url
    if (body.events != null) updates.events = JSON.stringify(body.events)
    if (body.active != null) updates.active = body.active
    const result = await updateById('outgoing_webhooks', id, updates)
    res.json(result.data ?? result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('outgoing_webhooks', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('webhooks.notFound', {}, { defaultValue: 'Webhook not found' }) })
    }
    await deleteById('outgoing_webhooks', id)
    res.status(204).end()
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
