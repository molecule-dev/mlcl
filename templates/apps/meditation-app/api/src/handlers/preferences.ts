import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const DEFAULTS = {
  voice: 'maya',
  default_duration_minutes: 10,
  reminder_enabled: true,
  reminder_time: '07:30',
  autoplay_next: false,
  weekly_goal_minutes: 120,
}

const updateSchema = z.object({
  voice: z.string().min(1).max(64).optional(),
  default_duration_minutes: z.number().int().min(1).max(180).optional(),
  reminder_enabled: z.boolean().optional(),
  reminder_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'reminder_time must be HH:MM')
    .optional(),
  autoplay_next: z.boolean().optional(),
  weekly_goal_minutes: z.number().int().min(5).max(10080).optional(),
})

async function findPreferences(userId: string): Promise<Record<string, unknown> | null> {
  const matches = await findMany<Record<string, unknown>>('user_preferences', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  })
  return matches[0] ?? null
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const existing = await findPreferences(userId)
    if (existing) {
      res.json(existing)
      return
    }
    res.json({ user_id: userId, ...DEFAULTS })
  } catch (error) {
    logger.error('preferences.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const body = req.body as z.infer<typeof updateSchema>
    const existing = await findPreferences(userId)

    if (!existing) {
      const created = await create('user_preferences', {
        user_id: userId,
        ...DEFAULTS,
        ...body,
        created_at: new Date(),
      })
      res.json(created.data)
      return
    }

    const id = existing.id as string
    const updated = await updateById('user_preferences', id, {
      ...body,
      updatedAt: new Date(),
    })
    res.json(updated.data)
  } catch (error) {
    logger.error('preferences.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
