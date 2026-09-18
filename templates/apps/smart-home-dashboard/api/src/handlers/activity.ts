import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  device_id: z.string().optional(),
  event_type: z.string().optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { page, limit, device_id, event_type } = req.query as unknown as {
      page: number
      limit: number
      device_id?: string
      event_type?: string
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (device_id) where.push({ field: 'device_id', operator: '=', value: device_id })
    if (event_type) where.push({ field: 'event_type', operator: '=', value: event_type })
    const events = await findMany('device_events', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'timestamp', direction: 'desc' }],
    })
    res.json(events)
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
