import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { writeAuditLog } from './_audit.js'

const router = Router()

const VALID_ROLES = ['owner', 'admin', 'operator', 'responder', 'member', 'viewer'] as const

const createSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  role: z.enum(VALID_ROLES).optional().default('member'),
  on_call: z.boolean().optional().default(false),
  shift: z.string().optional(),
  tz: z.string().optional(),
  avatar_initial: z.string().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  role: z.enum(VALID_ROLES).optional(),
  on_call: z.boolean().optional(),
  shift: z.string().optional(),
  tz: z.string().optional(),
  avatar_initial: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const rows = await findMany('team_members', {
    where,
    orderBy: [{ field: 'created_at', direction: 'asc' }],
  })
  res.json(rows)
})

router.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const initial = parsed.data.avatar_initial ?? parsed.data.name.trim().charAt(0).toUpperCase()
  const result = await create<Record<string, unknown>>('team_members', {
    user_id: userId,
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    on_call: parsed.data.on_call,
    shift: parsed.data.shift ?? null,
    tz: parsed.data.tz ?? null,
    avatar_initial: initial,
  })
  const created = (result.data ?? result) as { id: string }
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'team.create',
    scope: 'team',
    target: created.id,
    summary: `${parsed.data.name} <${parsed.data.email}>`,
    payload: { role: parsed.data.role },
  })
  res.status(201).json(result.data ?? result)
})

router.patch('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('team_members', id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('team.notFound', {}, { defaultValue: 'Team member not found' }) })
  }
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) updates[k] = v
  }
  if (Object.keys(updates).length === 0) {
    return res.json(existing)
  }
  const result = await updateById('team_members', id, updates)
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'team.update',
    scope: 'team',
    target: id,
    summary: existing.name as string | undefined,
    payload: updates,
  })
  res.json(result.data ?? result)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('team_members', id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('team.notFound', {}, { defaultValue: 'Team member not found' }) })
  }
  await deleteById('team_members', id)
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'team.delete',
    scope: 'team',
    target: id,
    summary: existing.name as string | undefined,
  })
  res.status(204).end()
})

export default router
