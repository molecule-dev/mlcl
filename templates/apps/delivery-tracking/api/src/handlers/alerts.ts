import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { type AlertRow, decorateAlerts } from '../lib/decorate.js'

const router = Router()

const createAlertSchema = z.object({
  shipment_id: z.string().nullable().optional(),
  type: z.string().min(1),
  severity: z.string().optional(),
  message: z.string().min(1),
})

const markReadSchema = z.object({
  read: z.boolean().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { unread } = req.query
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (unread === 'true') {
      where.push({ field: 'read_at', operator: 'is_null' })
    }
    const rows = await findMany<AlertRow>('alerts', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(await decorateAlerts(rows))
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createAlertSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { shipment_id, type, severity, message } = req.body
    const result = await create<Record<string, unknown>>('alerts', {
      user_id: userId,
      shipment_id: shipment_id || null,
      type,
      severity: severity || 'info',
      message,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/:id/read', validateBody(markReadSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('alerts', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('alerts.notFound', undefined, { defaultValue: 'Alert not found' }) })
      return
    }
    const result = await updateById<Record<string, unknown>>('alerts', id, {
      read_at: req.body?.read === false ? null : new Date(),
    })
    res.json(result.data)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('alerts', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('alerts.notFound', undefined, { defaultValue: 'Alert not found' }) })
      return
    }
    await deleteById('alerts', id)
    res.status(204).end()
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
