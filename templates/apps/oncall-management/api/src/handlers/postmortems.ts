/**
 * Postmortems handler — blameless incident reviews with action items.
 *
 * A postmortem links one incident (unique), carries a summary + contributing
 * factors, and owns action items with owners/status/due dates so the follow-
 * through is trackable. One postmortem per incident is enforced by a unique
 * index; creating a second for the same incident returns the existing one.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { loadRoster } from './_roster.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const createSchema = z.object({
  incident_id: z.string().uuid(),
  title: z.string().min(1).max(300).optional(),
  summary: z.string().max(8000).optional(),
  contributing_factors: z.array(z.string().max(500)).max(20).optional(),
  status: z.enum(['draft', 'published']).optional(),
})

const updateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  summary: z.string().max(8000).optional(),
  contributing_factors: z.array(z.string().max(500)).max(20).optional(),
  status: z.enum(['draft', 'published']).optional(),
})

const actionItemSchema = z.object({
  description: z.string().min(1).max(500),
  owner_member_id: z.string().uuid().nullable().optional(),
  due_at: z.string().min(10).nullable().optional(),
})

const actionItemUpdateSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  owner_member_id: z.string().uuid().nullable().optional(),
  status: z.enum(['open', 'in_progress', 'done']).optional(),
  due_at: z.string().min(10).nullable().optional(),
})

interface PostmortemRow {
  id: string
  user_id: string
  incident_id: string
  title: string
  summary: string
  contributing_factors: unknown
  status: string
}

interface ActionItemRow {
  id: string
  user_id: string
  postmortem_id: string
  description: string
  owner_member_id: string | null
  status: string
  due_at: string | null
}

const parseFactors = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string' && raw.length > 0) {
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch (_error) {
      return []
    }
  }
  return []
}

const loadOwnedPostmortem = async (userId: string, id: string): Promise<PostmortemRow | null> => {
  const row = await findById<PostmortemRow>('postmortems', id)
  if (!row || row.user_id !== userId) return null
  return row
}

const loadActionItems = async (userId: string, postmortemId: string): Promise<ActionItemRow[]> =>
  findMany<ActionItemRow>('postmortem_action_items', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'postmortem_id', operator: '=', value: postmortemId },
    ],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: 100,
  })

const projectActionItems = (
  items: ActionItemRow[],
  roster: Map<string, { name: string }>,
): Array<Record<string, unknown>> =>
  items.map((i) => ({
    ...i,
    owner_name: i.owner_member_id ? (roster.get(i.owner_member_id)?.name ?? null) : null,
  }))

const projectPostmortem = async (
  userId: string,
  pm: PostmortemRow,
  roster: Map<string, { name: string }>,
): Promise<Record<string, unknown>> => {
  const incident = await findById<{
    id: string
    title: string
    severity: string
    status: string
    service: string
    triggered_at: string
    resolved_at: string | null
  }>('incidents', pm.incident_id)
  const items = await loadActionItems(userId, pm.id)
  return {
    ...pm,
    contributing_factors: parseFactors(pm.contributing_factors),
    status: pm.status ?? 'draft',
    incident: incident
      ? {
          id: incident.id,
          title: incident.title,
          severity: incident.severity,
          status: incident.status,
          service: incident.service,
          triggered_at: incident.triggered_at,
          resolved_at: incident.resolved_at,
        }
      : null,
    action_items: projectActionItems(items, roster),
    open_action_items: items.filter((i) => i.status !== 'done').length,
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  await seedDemoForUser(userId)
  const postmortems = await findMany<PostmortemRow>('postmortems', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'updated_at', direction: 'desc' }],
    limit: 100,
  })
  const roster = await loadRoster(userId)
  const projected = []
  for (const pm of postmortems) {
    projected.push(await projectPostmortem(userId, pm, roster))
  }
  res.json(projected)
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const body = req.body as z.infer<typeof createSchema>
  const incident = await findById<{ id: string; user_id: string; title: string; status: string }>(
    'incidents',
    body.incident_id,
  )
  if (!incident || incident.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
  }
  // Unique per incident: return the existing review instead of failing.
  const existing = await findOne<PostmortemRow>('postmortems', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'incident_id', operator: '=', value: body.incident_id },
  ])
  if (existing) {
    const roster = await loadRoster(userId)
    return res.json(await projectPostmortem(userId, existing, roster))
  }
  const created = await create<PostmortemRow>('postmortems', {
    user_id: userId,
    incident_id: body.incident_id,
    title: body.title ?? `Postmortem: ${incident.title}`,
    summary: body.summary ?? '',
    contributing_factors: JSON.stringify(body.contributing_factors ?? []),
    status: body.status ?? 'draft',
    created_at: new Date(),
    updated_at: new Date(),
  })
  const pm = created.data
  if (!pm) {
    return res.status(500).json({
      error: t('postmortems.createFailed', {}, { defaultValue: 'Could not create postmortem' }),
    })
  }
  const roster = await loadRoster(userId)
  res.status(201).json(await projectPostmortem(userId, pm, roster))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const pm = await loadOwnedPostmortem(userId, id)
  if (!pm) {
    return res
      .status(404)
      .json({ error: t('postmortems.notFound', {}, { defaultValue: 'Postmortem not found' }) })
  }
  const roster = await loadRoster(userId)
  res.json(await projectPostmortem(userId, pm, roster))
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const pm = await loadOwnedPostmortem(userId, id)
  if (!pm) {
    return res
      .status(404)
      .json({ error: t('postmortems.notFound', {}, { defaultValue: 'Postmortem not found' }) })
  }
  const body = req.body as z.infer<typeof updateSchema>
  const result = await updateById<PostmortemRow>('postmortems', id, {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.summary !== undefined ? { summary: body.summary } : {}),
    ...(body.contributing_factors !== undefined
      ? { contributing_factors: JSON.stringify(body.contributing_factors) }
      : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    updated_at: new Date(),
  })
  const roster = await loadRoster(userId)
  res.json(await projectPostmortem(userId, result.data ?? pm, roster))
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const pm = await loadOwnedPostmortem(userId, id)
  if (!pm) {
    return res
      .status(404)
      .json({ error: t('postmortems.notFound', {}, { defaultValue: 'Postmortem not found' }) })
  }
  const items = await loadActionItems(userId, id)
  for (const item of items) {
    await deleteById('postmortem_action_items', item.id)
  }
  await deleteById('postmortems', id)
  res.status(204).end()
})

router.post(
  '/:id/action-items',
  validateBody(actionItemSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const pm = await loadOwnedPostmortem(userId, id)
    if (!pm) {
      return res.status(404).json({
        error: t('postmortems.notFound', {}, { defaultValue: 'Postmortem not found' }),
      })
    }
    const body = req.body as z.infer<typeof actionItemSchema>
    const roster = await loadRoster(userId)
    if (body.owner_member_id && !roster.has(body.owner_member_id)) {
      return res.status(404).json({
        error: t('team.notFound', {}, { defaultValue: 'Member not found' }),
      })
    }
    const dueAt = body.due_at ? new Date(body.due_at) : null
    const created = await create<ActionItemRow>('postmortem_action_items', {
      user_id: userId,
      postmortem_id: id,
      description: body.description,
      owner_member_id: body.owner_member_id ?? null,
      status: 'open',
      due_at: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(projectActionItems([created.data as ActionItemRow], roster)[0])
  },
)

router.put(
  '/:id/action-items/:itemId',
  validateBody(actionItemUpdateSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const pm = await loadOwnedPostmortem(userId, id)
    if (!pm) {
      return res.status(404).json({
        error: t('postmortems.notFound', {}, { defaultValue: 'Postmortem not found' }),
      })
    }
    const itemId = String(req.params.itemId ?? '')
    const item = await findById<ActionItemRow>('postmortem_action_items', itemId)
    if (!item || item.user_id !== userId || item.postmortem_id !== id) {
      return res.status(404).json({
        error: t('postmortems.actionItemNotFound', {}, { defaultValue: 'Action item not found' }),
      })
    }
    const body = req.body as z.infer<typeof actionItemUpdateSchema>
    const dueAt =
      body.due_at !== undefined ? (body.due_at ? new Date(body.due_at) : null) : undefined
    const result = await updateById<ActionItemRow>('postmortem_action_items', itemId, {
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.owner_member_id !== undefined ? { owner_member_id: body.owner_member_id } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(dueAt !== undefined
        ? { due_at: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null }
        : {}),
      updated_at: new Date(),
    })
    const roster = await loadRoster(userId)
    res.json(projectActionItems([result.data ?? item], roster)[0])
  },
)

router.delete('/:id/action-items/:itemId', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const pm = await loadOwnedPostmortem(userId, id)
  if (!pm) {
    return res.status(404).json({
      error: t('postmortems.notFound', {}, { defaultValue: 'Postmortem not found' }),
    })
  }
  const itemId = String(req.params.itemId ?? '')
  const item = await findById<ActionItemRow>('postmortem_action_items', itemId)
  if (!item || item.user_id !== userId || item.postmortem_id !== id) {
    return res.status(404).json({
      error: t('postmortems.actionItemNotFound', {}, { defaultValue: 'Action item not found' }),
    })
  }
  await deleteById('postmortem_action_items', itemId)
  res.status(204).end()
})

export default router
