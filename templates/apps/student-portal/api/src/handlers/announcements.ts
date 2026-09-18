import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { StudentPortalLimits } from '../tiers.js'
import { ensureStudentPortalSeeded } from './_seed.js'

const router = Router()

const createAnnouncementSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
  audience: z.enum(['school', 'class', 'self']).optional(),
  icon: z.string().optional(),
  pinned: z.boolean().optional(),
  school_id: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  await ensureStudentPortalSeeded(userId)
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const orderBy: OrderBy[] = [
    { field: 'pinned', direction: 'desc' },
    { field: 'created_at', direction: 'desc' },
  ]
  const announcements = await findMany('announcements', { where, orderBy })
  res.json(announcements)
})

router.post(
  '/',
  enforceLimit<StudentPortalLimits>({
    limitType: 'maxAnnouncements',
    getLimit: (limits) => limits.maxAnnouncements,
    getCurrent: async (userId) =>
      count('announcements', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createAnnouncementSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
    }
    const result = await create('announcements', {
      user_id: userId,
      title: req.body.title,
      body: req.body.body ?? null,
      audience: req.body.audience ?? 'self',
      icon: req.body.icon ?? null,
      pinned: Boolean(req.body.pinned),
      school_id: req.body.school_id ?? null,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  const id = getParamId(req)
  const announcement = await findById<Record<string, unknown>>('announcements', id)
  if (!announcement || announcement.user_id !== userId) {
    return res.status(404).json({
      error: t('announcements.notFound', undefined, { defaultValue: 'Announcement not found.' }),
    })
  }
  res.json(announcement)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  const id = getParamId(req)
  const announcement = await findById<Record<string, unknown>>('announcements', id)
  if (!announcement || announcement.user_id !== userId) {
    return res.status(404).json({
      error: t('announcements.notFound', undefined, { defaultValue: 'Announcement not found.' }),
    })
  }
  await deleteById('announcements', id)
  res.status(204).end()
})

export default router
