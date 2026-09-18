import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const updatePreferencesSchema = z.object({
  data: z.record(z.string(), z.unknown()),
})

async function getPrefs(userId: string): Promise<{ data: Record<string, unknown> } | null> {
  const rows = await findMany<{ data: Record<string, unknown> }>('user_preferences', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  })
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const row = await getPrefs(userId)
    res.json({ data: row?.data ?? {} })
  } catch (error) {
    logger.error('preferences.get', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.put('/', validateBody(updatePreferencesSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const body = req.body as z.infer<typeof updatePreferencesSchema>
    const existing = await getPrefs(userId)

    if (existing) {
      // Merge new keys into existing data so partial updates don't clobber.
      const merged = { ...existing.data, ...body.data }
      await updateMany('user_preferences', [{ field: 'user_id', operator: '=', value: userId }], {
        data: merged,
        updatedAt: new Date(),
      })
      res.json({ data: merged })
    } else {
      await create('user_preferences', {
        user_id: userId,
        data: body.data,
        created_at: new Date(),
      })
      res.json({ data: body.data })
    }
  } catch (error) {
    logger.error('preferences.update', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
