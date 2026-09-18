import { type NextFunction, type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface PrefsRow {
  id?: string
  user_id?: string
  price_alerts?: boolean
  rebalance_drift?: boolean
  dividends_paid?: boolean
  tax_docs_ready?: boolean
}

const DEFAULT_PREFS: Required<
  Pick<PrefsRow, 'price_alerts' | 'rebalance_drift' | 'dividends_paid' | 'tax_docs_ready'>
> = {
  price_alerts: true,
  rebalance_drift: true,
  dividends_paid: true,
  tax_docs_ready: true,
}

const updateSchema = z.object({
  price_alerts: z.boolean().optional(),
  rebalance_drift: z.boolean().optional(),
  dividends_paid: z.boolean().optional(),
  tax_docs_ready: z.boolean().optional(),
})

router.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized') })
      return
    }
    const row = await findOne<PrefsRow>('notification_preferences', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (!row) {
      res.json({ user_id: userId, ...DEFAULT_PREFS })
      return
    }
    res.json({ ...DEFAULT_PREFS, ...row })
  } catch (error) {
    logger.error('notification-preferences get failed', error)
    next(error)
  }
})

router.put(
  '/',
  validateBody(updateSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({ error: t('auth.unauthorized') })
        return
      }
      const body = req.body as z.infer<typeof updateSchema>
      const existing = await findOne<PrefsRow>('notification_preferences', [
        { field: 'user_id', operator: '=', value: userId },
      ])
      if (existing?.id) {
        const result = await updateById('notification_preferences', existing.id, {
          ...body,
          updated_at: new Date(),
        })
        res.json({
          ...DEFAULT_PREFS,
          ...((result as { data?: PrefsRow }).data ?? existing),
          ...body,
        })
        return
      }
      const result = await create('notification_preferences', {
        user_id: userId,
        ...DEFAULT_PREFS,
        ...body,
      })
      res.json({
        ...DEFAULT_PREFS,
        ...((result as { data?: PrefsRow }).data ?? body),
        user_id: userId,
      })
    } catch (error) {
      logger.error('notification-preferences update failed', error)
      next(error)
    }
  },
)

export default router
