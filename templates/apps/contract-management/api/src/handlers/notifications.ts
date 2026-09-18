/**
 * /api/notifications — list / mark-read / delete the current user's
 * notifications.
 *
 * Field mapping (DB → wire):
 *   kind     → type     (the UI uses `type` to drive iconography)
 *   read_at  → unread   (boolean, derived from null read_at)
 *   link     → href     (UI convention)
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireUserOwnership } from '../lib/authz.js'

const router = Router()

const markReadSchema = z.object({
  read: z.boolean().optional().default(true),
})

const markAllReadSchema = z.object({ read: z.boolean().optional() }).optional()

interface NotificationRow {
  id: string
  user_id: string
  kind: string
  title: string
  body: string
  contract_id: string | null
  payload: Record<string, unknown> | null
  link: string | null
  read_at: string | null
  created_at: string
}

function shape(row: NotificationRow): {
  id: string
  type: string
  title: string
  body: string
  contract_id: string | null
  href: string | null
  payload: Record<string, unknown> | null
  created_at: string
  read_at: string | null
  unread: boolean
} {
  return {
    id: row.id,
    type: row.kind || 'system_message',
    title: row.title,
    body: row.body,
    contract_id: row.contract_id,
    href: row.link ?? (row.contract_id ? `/contracts/${row.contract_id}` : null),
    payload: row.payload,
    created_at: row.created_at,
    read_at: row.read_at,
    unread: !row.read_at,
  }
}

router.use(authorizers.auth())

router.get('/', async (_req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const items = await findMany<NotificationRow>('notifications', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })
  res.json(items.map(shape))
})

router.post(
  '/mark-all-read',
  validateBody(markAllReadSchema),
  async (_req: Request, res: Response) => {
    const userId = res.locals.session.userId as string
    const items = await findMany<NotificationRow>('notifications', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 10_000,
    })
    const now = new Date().toISOString()
    for (const n of items) {
      if (!n.read_at) {
        await updateById('notifications', n.id, { read_at: now })
      }
    }
    res.json({ updated: items.filter((n) => !n.read_at).length })
  },
)

router.patch('/:id', validateBody(markReadSchema), async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireUserOwnership<NotificationRow>(
    'notifications',
    req.params.id as string,
    userId,
  )
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }) })
    return
  }
  const body = req.body as z.infer<typeof markReadSchema>
  const result = await updateById<NotificationRow>('notifications', req.params.id as string, {
    read_at: body.read ? new Date().toISOString() : null,
  })
  res.json(shape((result.data ?? result) as NotificationRow))
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireUserOwnership<NotificationRow>(
    'notifications',
    req.params.id as string,
    userId,
  )
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }) })
    return
  }
  await deleteById('notifications', req.params.id as string)
  res.status(204).end()
})

export default router
