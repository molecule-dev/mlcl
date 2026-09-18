/**
 * Map collaborator handlers — invite by email, list, accept, change role,
 * revoke. Only the map owner may invite/revoke or change roles. The invited
 * user accepts via `POST /collaborators/:id/accept` (matches their session
 * email/userId to the row).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  internalError,
  type MapCollaboratorRow,
  requireOwnedMap,
  requireReadableMap,
  requireUser,
  validationError,
} from '../lib/authz.js'

interface UserLookupRow {
  id: string
  email: string | null
}

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const listSchema = z.object({
  map_id: z.string().uuid(),
})

const inviteSchema = z.object({
  map_id: z.string().uuid(),
  email: z.string().email().max(320),
  role: z.enum(['viewer', 'commenter', 'editor']).optional(),
})

const updateSchema = z.object({
  role: z.enum(['viewer', 'commenter', 'editor']),
})

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = listSchema.safeParse(req.query)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const map = await requireReadableMap(parsed.data.map_id, ownerId)
    if (!map) {
      res.json([])
      return
    }
    const items = await findMany<MapCollaboratorRow>('map_collaborators', {
      where: [{ field: 'map_id', operator: '=', value: parsed.data.map_id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('collaborators.handler', error)
    internalError(res)
  }
})

/**
 * Inbox of pending invites for the *current* user across all maps. Joined
 * with the map row so the Notifications page can render a single list
 * without N+1 fetches per map (the previous `/maps?scope=shared` approach
 * never surfaced pending invites because shared scope filters on
 * accepted_at IS NOT NULL — pending invites are accepted_at IS NULL).
 */
router.get('/inbox', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const me = await findOne<UserLookupRow>('users', [
      { field: 'id', operator: '=', value: ownerId },
    ])
    const all = await findMany<MapCollaboratorRow>('map_collaborators', {
      where: [{ field: 'accepted_at', operator: 'is_null' }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    const mine = all.filter(
      (c) =>
        (me?.email && c.email && c.email.toLowerCase() === me.email.toLowerCase()) ||
        c.user_id === ownerId,
    )
    if (mine.length === 0) {
      res.json([])
      return
    }
    const mapIds = Array.from(new Set(mine.map((c) => c.map_id).filter(Boolean)))
    const maps = await findMany<{
      id: string
      title: string
      owner_id: string
      updated_at: string
    }>('maps', {
      where: [
        { field: 'id', operator: 'in', value: mapIds },
        { field: 'trashed_at', operator: 'is_null' },
      ],
    })
    const mapById = new Map(maps.map((m) => [m.id, m]))
    res.json(
      mine
        .filter((c) => mapById.has(c.map_id))
        .map((c) => ({ collab: c, map: mapById.get(c.map_id) })),
    )
  } catch (error) {
    logger.error('collaborators.handler', error)
    internalError(res)
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = inviteSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const map = await requireOwnedMap(parsed.data.map_id, ownerId)
    if (!map) {
      res.status(404).json({ error: t('map.notFound', {}, { defaultValue: 'Map not found' }) })
      return
    }
    // If the invited email already corresponds to a real user, link it.
    const existingUser = await findOne<UserLookupRow>('users', [
      { field: 'email', operator: '=', value: parsed.data.email },
    ])
    const result = await create<MapCollaboratorRow>('map_collaborators', {
      map_id: parsed.data.map_id,
      user_id: existingUser?.id ?? null,
      email: parsed.data.email,
      role: parsed.data.role ?? 'viewer',
      // All invites start as pending — the invitee must actively accept via
      // /collaborators/:id/accept (or via the Notifications inbox UI). An
      // earlier version auto-accepted when the invitee already had an account,
      // which silently bypassed the inbox/notification UX entirely.
      accepted_at: null,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('collaborators.handler', error)
    internalError(res)
  }
})

router.post('/:id/accept', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const collab = await findOne<MapCollaboratorRow>('map_collaborators', [
      { field: 'id', operator: '=', value: id.data.id },
    ])
    if (!collab) {
      res
        .status(404)
        .json({ error: t('collaborator.notFound', {}, { defaultValue: 'Invite not found' }) })
      return
    }
    // Caller must either be the user_id, or a user whose email matches the
    // pending invite.
    const me = await findOne<UserLookupRow>('users', [
      { field: 'id', operator: '=', value: ownerId },
    ])
    const matchesByUserId = collab.user_id === ownerId
    const matchesByEmail =
      !!collab.email && !!me?.email && collab.email.toLowerCase() === me.email.toLowerCase()
    if (!matchesByUserId && !matchesByEmail) {
      res
        .status(404)
        .json({ error: t('collaborator.notFound', {}, { defaultValue: 'Invite not found' }) })
      return
    }
    const result = await updateById<MapCollaboratorRow>('map_collaborators', id.data.id, {
      user_id: ownerId,
      accepted_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('collaborators.handler', error)
    internalError(res)
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const collab = await findOne<MapCollaboratorRow>('map_collaborators', [
      { field: 'id', operator: '=', value: id.data.id },
    ])
    if (!collab) {
      res
        .status(404)
        .json({ error: t('collaborator.notFound', {}, { defaultValue: 'Invite not found' }) })
      return
    }
    const map = await requireOwnedMap(collab.map_id, ownerId)
    if (!map) {
      res
        .status(404)
        .json({ error: t('collaborator.notFound', {}, { defaultValue: 'Invite not found' }) })
      return
    }
    const result = await updateById<MapCollaboratorRow>('map_collaborators', id.data.id, {
      role: body.data.role,
    })
    res.json(result.data)
  } catch (error) {
    logger.error('collaborators.handler', error)
    internalError(res)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const collab = await findOne<MapCollaboratorRow>('map_collaborators', [
      { field: 'id', operator: '=', value: id.data.id },
    ])
    if (!collab) {
      res
        .status(404)
        .json({ error: t('collaborator.notFound', {}, { defaultValue: 'Invite not found' }) })
      return
    }
    const map = await requireOwnedMap(collab.map_id, ownerId)
    if (!map) {
      res
        .status(404)
        .json({ error: t('collaborator.notFound', {}, { defaultValue: 'Invite not found' }) })
      return
    }
    await deleteById('map_collaborators', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('collaborators.handler', error)
    internalError(res)
  }
})

export default router
