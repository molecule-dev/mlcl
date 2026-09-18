import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createFavoriteSchema = z
  .object({
    session_id: z.string().nullable().optional(),
    course_id: z.string().nullable().optional(),
  })
  .refine((d) => Boolean(d.session_id) || Boolean(d.course_id), {
    message: 'Either session_id or course_id is required',
  })

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const favorites = await findMany('user_favorites', { where, orderBy })
    res.json(favorites)
  } catch (error) {
    logger.error('favorites.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createFavoriteSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const body = req.body as z.infer<typeof createFavoriteSchema>
    const result = await create('user_favorites', {
      user_id: userId,
      session_id: body.session_id ?? null,
      course_id: body.course_id ?? null,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('favorites.create', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('user_favorites', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('favorites.notFound', {}, { defaultValue: 'Favorite not found' }),
      })
    }
    await deleteById('user_favorites', id)
    res.status(204).end()
  } catch (error) {
    logger.error('favorites.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
