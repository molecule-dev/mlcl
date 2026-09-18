/**
 * webhook-manager — team members.
 *
 * A team_member row links a user to the workspace owner with a role.
 * Schema (per 0010 migration):
 *   user_id    — workspace owner (the inviter)
 *   member_id  — the joined user (nullable for pending invites)
 *   name, email, role, status, last_active_at
 *
 * Invites flow:
 *   POST /team_members → row in `pending` state (member_id null)
 *   POST /team_members/:id/resend → updates updated_at (and would resend email)
 *   PATCH /team_members/:id  → update role/name
 *   DELETE /team_members/:id → remove (member or pending invite)
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { recordAudit } from './_audit.js'

const router = Router()

const ROLES = ['admin', 'developer', 'viewer'] as const

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const members = await findMany('team_members', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
  })
  res.json(members)
})

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(ROLES).default('developer'),
  name: z.string().max(120).optional(),
})

router.post('/', validateBody(inviteSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const body = req.body as z.infer<typeof inviteSchema>
  const result = await create('team_members', {
    user_id: userId,
    member_id: null,
    email: body.email.toLowerCase(),
    name: body.name ?? body.email.split('@')[0],
    role: body.role,
    status: 'pending',
    last_active_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  })
  const row = result.data as Record<string, unknown> | null
  await recordAudit({
    userId,
    action: 'team.invited',
    target: typeof row?.id === 'string' ? row.id : null,
    metadata: { email: body.email.toLowerCase(), role: body.role },
    req,
  })
  res.status(201).json(row)
})

const updateMemberSchema = z.object({
  role: z.enum(ROLES).optional(),
  name: z.string().max(120).optional(),
})

router.patch('/:id', validateBody(updateMemberSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = getParamId(req)
  const member = await findById<Record<string, unknown>>('team_members', id)
  if (!member || member.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('team.notFound', {}, { defaultValue: 'Team member not found' }) })
    return
  }
  const body = req.body as z.infer<typeof updateMemberSchema>
  const updates: Record<string, unknown> = { updated_at: new Date() }
  if (body.role !== undefined) updates.role = body.role
  if (body.name !== undefined) updates.name = body.name
  const result = await updateById('team_members', id, updates)
  if (body.role !== undefined && body.role !== member.role) {
    await recordAudit({
      userId,
      action: 'team.role-changed',
      target: id,
      metadata: { from: member.role, to: body.role, email: member.email },
      req,
    })
  }
  res.json(result.data)
})

router.post('/:id/resend', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = getParamId(req)
  const member = await findById<Record<string, unknown>>('team_members', id)
  if (!member || member.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('team.notFound', {}, { defaultValue: 'Team member not found' }) })
    return
  }
  if (member.status !== 'pending') {
    res.status(400).json({
      error: t('team.notPending', {}, { defaultValue: 'Cannot resend — invite already accepted' }),
    })
    return
  }
  await updateById('team_members', id, { updated_at: new Date() })
  res.json({ resent: true })
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = getParamId(req)
  const member = await findById<Record<string, unknown>>('team_members', id)
  if (!member || member.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('team.notFound', {}, { defaultValue: 'Team member not found' }) })
    return
  }
  await deleteById('team_members', id)
  await recordAudit({
    userId,
    action: 'team.removed',
    target: id,
    metadata: { email: member.email, role: member.role },
    req,
  })
  res.json({ removed: true })
})

export default router
