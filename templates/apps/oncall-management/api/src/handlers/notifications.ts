/**
 * Notifications handler — the in-app paging + activity feed. Incident
 * trigger/ack/resolve/escalate transitions write rows here (that IS the
 * "page the on-call user" mechanism — deliberately in-app only, fully
 * testable without SMS/Slack), alongside assignment and system notices.
 * The Notifications page renders whatever is actually in the table.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  updateMany,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

const createSchema = z.object({
  kind: z
    .enum(['page', 'ack', 'resolve', 'escalate', 'note', 'assignment', 'status', 'system'])
    .optional(),
  severity: z.string().optional(),
  title: z.string().min(1),
  detail: z.string().optional(),
  href: z.string().nullable().optional(),
  read: z.boolean().optional(),
})

const updateSchema = z.object({
  read: z.boolean().optional(),
  title: z.string().optional(),
  detail: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }
  await seedDemoForUser(userId)
  const rows = await findMany('notifications', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 200,
  })
  res.json(rows)
})

router.post('/read-all', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }
  const result = await updateMany(
    'notifications',
    [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'read', operator: '=', value: false },
    ],
    { read: true },
  )
  res.json({ updated: result.affected ?? 0 })
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }
  const row = await findById<Record<string, unknown>>('notifications', getParamId(req))
  if (!row || row.user_id !== userId) {
    res.status(404).json({ error: t('notifications.notFound') })
    return
  }
  res.json(row)
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }
  const body = req.body as z.infer<typeof createSchema>
  const result = await create('notifications', {
    user_id: userId,
    kind: body.kind ?? 'status',
    severity: body.severity ?? 'info',
    title: body.title,
    detail: body.detail ?? '',
    href: body.href ?? null,
    read: body.read ?? false,
    created_at: new Date(),
  })
  res.status(201).json(result.data ?? result)
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }
  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('notifications', id)
  if (!existing || existing.user_id !== userId) {
    res.status(404).json({ error: t('notifications.notFound') })
    return
  }
  const result = await updateById('notifications', id, req.body as Record<string, unknown>)
  res.json(result.data ?? result)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }
  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('notifications', id)
  if (!existing || existing.user_id !== userId) {
    res.status(404).json({ error: t('notifications.notFound') })
    return
  }
  await deleteById('notifications', id)
  res.status(204).end()
})

export default router
