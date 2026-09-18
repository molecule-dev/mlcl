import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUserSafe } from './_seed.js'

const router = Router()

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
}

const listQuery = z.object({
  read: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().optional().default(50),
  page: z.coerce.number().optional().default(1),
})

router.get('/', validateQuery(listQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    await seedDemoForUserSafe(userId)
    const { read, limit, page } = req.query as unknown as z.infer<typeof listQuery>

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (read === 'true') where.push({ field: 'read', operator: '=', value: true })
    if (read === 'false') where.push({ field: 'read', operator: '=', value: false })

    const rows = await findMany('notifications', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(rows)
  } catch (error) {
    console.error('Failed to list notifications', error)
    res.status(500).json({
      error: t('notifications.listFailed', {}, { defaultValue: 'Failed to list notifications' }),
    })
  }
})

const markReadSchema = z.object({ read: z.boolean().optional().default(true) })

router.post('/:id/read', validateBody(markReadSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const body = req.body as z.infer<typeof markReadSchema>

    const rows = await findMany('notifications', {
      where: [
        { field: 'id', operator: '=', value: id },
        { field: 'user_id', operator: '=', value: userId },
      ],
      limit: 1,
    })
    if (rows.length === 0) {
      res.status(404).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    const result = await updateById('notifications', id, { read: body.read })
    res.json(result.data)
  } catch (error) {
    console.error('Failed to mark notification', error)
    res.status(500).json({
      error: t('notifications.updateFailed', {}, { defaultValue: 'Failed to update notification' }),
    })
  }
})

router.post('/mark-all-read', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const rows = await findMany('notifications', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read', operator: '=', value: false },
      ],
    })
    let updated = 0
    for (const row of rows) {
      await updateById('notifications', String(row.id), { read: true })
      updated++
    }
    res.json({ updated })
  } catch (error) {
    console.error('Failed to mark all read', error)
    res.status(500).json({
      error: t(
        'notifications.updateFailed',
        {},
        { defaultValue: 'Failed to update notifications' },
      ),
    })
  }
})

export default router
