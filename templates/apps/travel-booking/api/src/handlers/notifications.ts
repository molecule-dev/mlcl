import type { Request, Response } from 'express'
import { Router } from 'express'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, updateById, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams } from '@molecule/api-middleware-validation'

const router = Router()

interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  href: string | null
  read: boolean
  created_at: string
}

function shape(row: NotificationRow): {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  created_at: string
  unread: boolean
} {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? '',
    href: row.href,
    created_at: row.created_at,
    unread: !row.read,
  }
}

const WELCOME_NOTIFICATIONS = [
  {
    type: 'security_alert',
    title: 'Welcome to Sojourn',
    body: 'Account ready. Set up two-factor auth and a default payment method to unlock instant booking.',
    href: '/account',
  },
  {
    type: 'price_drop',
    title: '4 saved properties dropped this week',
    body: 'Casa Mirador Oaxaca dropped 18% for autumn dates. Lighthouse Suites Cinque Terre dropped 12%.',
    href: '/favorites',
  },
  {
    type: 'trip_reminder',
    title: 'Plan your next trip',
    body: 'Curated stays in 8 destinations are waiting — the best dates fill up first.',
    href: '/search',
  },
]

async function ensureWelcomeSeed(userId: string): Promise<void> {
  const existing = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existing > 0) return
  for (const n of WELCOME_NOTIFICATIONS) {
    await create('notifications', {
      user_id: userId,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      read: false,
    })
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  await ensureWelcomeSeed(userId)
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const rows = (await findMany('notifications', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 100,
  })) as NotificationRow[]
  res.json({ data: rows.map(shape) })
})

router.get('/unread-count', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  await ensureWelcomeSeed(userId)
  const unread = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'read', operator: '=', value: false },
  ])
  res.json({ unread })
})

router.post('/:id/read', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = String(req.params.id)
  // Atomic, ownership-scoped write: only a row owned by the caller is updated,
  // so another tenant's notification is never mutated or disclosed.
  const where: WhereCondition[] = [
    { field: 'id', operator: '=', value: id },
    { field: 'user_id', operator: '=', value: userId },
  ]
  const result = await updateMany('notifications', where, { read: true })
  if (!result.affected) {
    res
      .status(404)
      .json({ error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }) })
    return
  }
  const fresh = (await findById('notifications', id)) as NotificationRow | null
  res.json(fresh ? shape(fresh) : { id, unread: false })
})

router.post('/read-all', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const where: WhereCondition[] = [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'read', operator: '=', value: false },
  ]
  const unread = (await findMany('notifications', { where, limit: 1000 })) as NotificationRow[]
  for (const n of unread) {
    await updateById('notifications', n.id, { read: true })
  }
  res.json({ data: { marked: unread.length } })
})

export default router
