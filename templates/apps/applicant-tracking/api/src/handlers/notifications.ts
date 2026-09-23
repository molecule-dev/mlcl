import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const listQuerySchema = z.object({
  unread: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const parsed = listQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
        errors: parsed.error.issues,
      })
    }
    const where: { field: string; operator: '=' | 'is_null'; value?: unknown }[] = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (parsed.data.unread === 'true') {
      where.push({ field: 'read_at', operator: 'is_null' })
    }
    const rows = await findMany('notifications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: parsed.data.limit,
    })
    res.json(rows)
  } catch (err) {
    logger.error('notifications.list_failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
