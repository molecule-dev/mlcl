import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { isUuid } from '../lib/is-uuid.js'

const router = Router()

const inviteSchema = z.object({
  team_id: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'developer', 'viewer']).optional(),
})

const updateSchema = z.object({
  role: z.enum(['admin', 'developer', 'viewer']).optional(),
  joined_at: z.string().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const teamId = (req.query.team_id as string | undefined) ?? userId

    // Caller must be a member of the team to read its roster (no IDOR).
    const callerMembership = await findMany('team_members', {
      where: [
        { field: 'team_id', operator: '=', value: teamId },
        { field: 'user_id', operator: '=', value: userId },
      ],
    })
    const isOwnTeam = teamId === userId
    if (!isOwnTeam && callerMembership.length === 0) {
      return res.status(403).json({ error: t('errors.forbidden') })
    }

    const where: WhereCondition[] = [{ field: 'team_id', operator: '=', value: teamId }]
    const orderBy: OrderBy[] = [{ field: 'invited_at', direction: 'desc' }]
    const rows = await findMany('team_members', { where, orderBy })
    res.json(rows)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    if (!isUuid(getParamId(req))) return res.status(404).json({ error: t('teamMembers.notFound') })
    const row = await findById<Record<string, unknown>>('team_members', getParamId(req))
    if (!row) return res.status(404).json({ error: t('teamMembers.notFound') })
    // Authorization: caller must share the team or be the inviter.
    const sameTeam = row.team_id === userId
    const sameUser = row.user_id === userId
    if (!sameTeam && !sameUser) {
      const peers = await findMany('team_members', {
        where: [
          { field: 'team_id', operator: '=', value: row.team_id as string },
          { field: 'user_id', operator: '=', value: userId },
        ],
      })
      if (peers.length === 0) return res.status(404).json({ error: t('teamMembers.notFound') })
    }
    res.json(row)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(inviteSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    // The frontend sends `team_id: 'self'` for the "my own workspace" case
    // because the inviter doesn't know their own user-id client-side. Map
    // it to the caller's own id so the team_id column (uuid) gets a valid
    // value instead of blowing up Postgres with a non-uuid literal.
    const teamId = req.body.team_id === 'self' ? userId : req.body.team_id
    const isOwnTeam = teamId === userId
    if (!isOwnTeam) {
      const adminCheck = await findMany('team_members', {
        where: [
          { field: 'team_id', operator: '=', value: teamId },
          { field: 'user_id', operator: '=', value: userId },
          { field: 'role', operator: '=', value: 'admin' },
        ],
      })
      if (adminCheck.length === 0) {
        return res.status(403).json({ error: t('errors.forbidden') })
      }
    }
    const result = await create('team_members', {
      team_id: teamId,
      user_id: userId,
      email: req.body.email,
      role: req.body.role ?? 'viewer',
      invited_at: new Date(),
      created_at: new Date(),
    })
    res.status(201).json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    if (!isUuid(id)) return res.status(404).json({ error: t('teamMembers.notFound') })
    const existing = await findById<Record<string, unknown>>('team_members', id)
    if (!existing) return res.status(404).json({ error: t('teamMembers.notFound') })
    // The team owner (team_id == userId) or the row's owner can update.
    if (existing.team_id !== userId && existing.user_id !== userId) {
      return res.status(403).json({ error: t('errors.forbidden') })
    }
    const updates: Record<string, unknown> = {}
    if (req.body.role !== undefined) updates.role = req.body.role
    if (req.body.joined_at !== undefined) updates.joined_at = new Date(req.body.joined_at)
    const result = await updateById('team_members', id, updates)
    res.json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    if (!isUuid(id)) return res.status(404).json({ error: t('teamMembers.notFound') })
    const existing = await findById<Record<string, unknown>>('team_members', id)
    if (!existing) return res.status(404).json({ error: t('teamMembers.notFound') })
    if (existing.team_id !== userId && existing.user_id !== userId) {
      return res.status(403).json({ error: t('errors.forbidden') })
    }
    await deleteById('team_members', id)
    res.status(204).end()
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
