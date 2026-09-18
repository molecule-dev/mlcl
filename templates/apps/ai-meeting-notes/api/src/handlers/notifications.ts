import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface NotificationRow {
  id: string
  user_id: string
  kind: string
  title: string
  body: string | null
  link: string | null
  read_at: string | Date | null
  created_at: string | Date
}

function isoDate(value: string | Date | null): string | null {
  if (value == null) return null
  return value instanceof Date ? value.toISOString() : String(value)
}

const createNotificationSchema = z.object({
  kind: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional(),
  link: z.string().optional(),
})

const updateNotificationSchema = z.object({
  read: z.boolean().optional(),
})

function enrich(row: NotificationRow): Record<string, unknown> {
  return {
    id: row.id,
    type: row.kind,
    kind: row.kind,
    title: row.title,
    body: row.body ?? '',
    href: row.link,
    link: row.link,
    created_at: isoDate(row.created_at) ?? '',
    read_at: isoDate(row.read_at),
    unread: row.read_at == null,
    read: row.read_at != null,
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const rows = await findMany<NotificationRow>('notifications', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })

  res.json(rows.map(enrich))
})

router.post('/', validateBody(createNotificationSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }
  const body = req.body as z.infer<typeof createNotificationSchema>
  const result = await create('notifications', {
    user_id: userId,
    kind: body.kind,
    title: body.title,
    body: body.body ?? null,
    link: body.link ?? null,
    created_at: new Date(),
  })
  const created = (result as { data?: Record<string, unknown> }).data ?? result
  res.status(201).json(created)
})

router.put('/:id', validateBody(updateNotificationSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const id = getParamId(req)
  const existing = await findById<NotificationRow>('notifications', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('notifications.notFound', undefined, {
        defaultValue: 'Notification not found.',
      }),
    })
  }

  const body = req.body as z.infer<typeof updateNotificationSchema>
  const updates: Record<string, unknown> = {}
  if (body.read === true) updates.read_at = new Date()
  if (body.read === false) updates.read_at = null

  const result = await updateById('notifications', id, updates)
  res.json((result as { data?: Record<string, unknown> }).data ?? result)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const id = getParamId(req)
  const existing = await findById<NotificationRow>('notifications', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('notifications.notFound', undefined, {
        defaultValue: 'Notification not found.',
      }),
    })
  }

  await deleteById('notifications', id)
  res.status(204).end()
})

export default router
