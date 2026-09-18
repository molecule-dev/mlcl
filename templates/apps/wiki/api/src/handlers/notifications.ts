import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createSchema = z.object({
  kind: z.string().min(1).max(64),
  title: z.string().min(1).max(255),
  body: z.string().max(2000).optional(),
  page_id: z.string().nullable().optional(),
  actor_id: z.string().nullable().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const items = await findMany('wiki_notifications', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 100,
    })
    res.json(items)
  } catch (err) {
    console.error('[notifications.list]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const body = req.body as z.infer<typeof createSchema>
    const result = await create('wiki_notifications', {
      user_id: userId,
      kind: body.kind,
      title: body.title,
      body: body.body ?? null,
      page_id: body.page_id ?? null,
      actor_id: body.actor_id ?? null,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error('[notifications.create]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const id = String(req.params.id)
    const existing = await findOne<{ user_id: string }>('wiki_notifications', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (!existing) {
      return res.status(404).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
    }
    const result = await updateById('wiki_notifications', id, { read_at: new Date() })
    res.json(result.data)
  } catch (err) {
    console.error('[notifications.read]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/mark-all-read', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const unread = await findMany<{ id: string }>('wiki_notifications', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read_at', operator: 'is_null', value: null },
      ],
    })
    const now = new Date()
    for (const n of unread) {
      await updateById('wiki_notifications', n.id, { read_at: now })
    }
    res.json({ marked: unread.length })
  } catch (err) {
    console.error('[notifications.markAll]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
