/**
 * Team handler — workspace members + pending invites.
 *
 * The team_members table is user-scoped (every row has user_id pointing
 * at the workspace owner). The list endpoint returns active members in
 * one response and pending invites in a second sub-array so the Team
 * page can render both panels from a single fetch.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'responder', 'viewer']).optional(),
})

const updateMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'responder', 'viewer']).optional(),
  oncall: z.boolean().optional(),
  member_status: z.enum(['active', 'invited', 'suspended', 'resolved']).optional(),
  active: z.boolean().optional(),
})

import crypto from 'node:crypto'

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  await seedDemoForUser(userId)
  const members = await findMany('team_members', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: 200,
  })
  const invites = await findMany('team_invites', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'pending' },
    ],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 100,
  })
  res.json({ members, invites })
})

router.post('/invite', validateBody(inviteSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const body = req.body as z.infer<typeof inviteSchema>
  const inviteResult = await create('team_invites', {
    user_id: userId,
    email: body.email,
    role: body.role ?? 'responder',
    status: 'pending',
    created_at: new Date(),
  })
  // Also write a team_members row so the UI shows the invitee in the
  // members panel as "invited" — matching the polished mockup.
  await create('team_members', {
    user_id: userId,
    member_id: crypto.randomUUID(),
    name: body.email.split('@')[0] ?? body.email,
    email: body.email,
    role: body.role ?? 'responder',
    timezone: 'UTC',
    oncall: false,
    member_status: 'invited',
    active: false,
    assigned_incidents: 0,
    acked_30d: 0,
    resolved_30d: 0,
    last_active: 'pending',
    created_at: new Date(),
  })
  res.status(201).json(inviteResult.data)
})

router.put(
  '/members/:id',
  validateBody(updateMemberSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const member = await findById<Record<string, unknown>>('team_members', id)
    if (!member || member.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('team.notFound', {}, { defaultValue: 'Member not found' }) })
    }
    const result = await updateById('team_members', id, req.body as Record<string, unknown>)
    res.json(result.data)
  },
)

router.delete('/members/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const member = await findById<Record<string, unknown>>('team_members', id)
  if (!member || member.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('team.notFound', {}, { defaultValue: 'Member not found' }) })
  }
  await deleteById('team_members', id)
  res.status(204).end()
})

router.delete('/invites/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const invite = await findById<Record<string, unknown>>('team_invites', id)
  if (!invite || invite.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('team.inviteNotFound', {}, { defaultValue: 'Invite not found' }) })
  }
  await deleteById('team_invites', id)
  res.status(204).end()
})

export default router
