import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
})

router.get(
  '/',
  validateQuery(listNotificationsQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
      const { limit } = req.query as { limit?: number }
      const rows = await findMany('notifications', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: limit ?? 100,
      })
      res.json(rows)
    } catch (_err) {
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

export default router
