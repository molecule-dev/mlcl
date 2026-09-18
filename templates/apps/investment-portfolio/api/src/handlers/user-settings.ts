import { type NextFunction, type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface SettingsRow {
  id?: string
  user_id?: string
  advisor_email?: string | null
  tax_method?: string | null
}

const DEFAULTS: Required<Pick<SettingsRow, 'advisor_email' | 'tax_method'>> = {
  advisor_email: '',
  tax_method: 'FIFO',
}

const updateSchema = z.object({
  advisor_email: z.string().email().nullable().optional().or(z.literal('')),
  tax_method: z.enum(['FIFO', 'LIFO', 'SpecID']).optional(),
})

router.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized') })
      return
    }
    const row = await findOne<SettingsRow>('user_settings', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.json({ ...DEFAULTS, ...(row ?? { user_id: userId }) })
  } catch (error) {
    logger.error('user-settings get failed', error)
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
      const existing = await findOne<SettingsRow>('user_settings', [
        { field: 'user_id', operator: '=', value: userId },
      ])
      if (existing?.id) {
        await updateById('user_settings', existing.id, {
          ...body,
          updated_at: new Date(),
        })
        res.json({ ...DEFAULTS, ...existing, ...body })
        return
      }
      const result = await create('user_settings', {
        user_id: userId,
        ...DEFAULTS,
        ...body,
      })
      res.json({
        ...DEFAULTS,
        ...((result as { data?: SettingsRow }).data ?? body),
        user_id: userId,
      })
    } catch (error) {
      logger.error('user-settings update failed', error)
      next(error)
    }
  },
)

export default router
