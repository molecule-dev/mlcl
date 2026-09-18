/**
 * Space-member handlers — admins manage who can read/write a space.
 *
 * Mounted under `/spaces/:spaceId/members`. Only space admins (creator or
 * member with role=admin) can mutate membership; any space member may
 * list members.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import {
  internalError,
  requireSpaceAdminAccess,
  requireSpaceMembership,
  requireUser,
  type SpaceMemberRow,
  validationError,
} from '../lib/authz.js'

const router = Router({ mergeParams: true })

const spaceParam = z.object({ spaceId: z.string().uuid() })
const memberIdParam = z.object({ spaceId: z.string().uuid(), id: z.string().uuid() })

const addSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['admin', 'editor', 'viewer']).default('viewer'),
})

router.get('/', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const params = spaceParam.safeParse(req.params)
  if (!params.success) {
    validationError(res, params.error.issues)
    return
  }
  try {
    const space = await requireSpaceMembership(params.data.spaceId, uid)
    if (!space) {
      res.status(404).json({ error: t('space.notFound', {}, { defaultValue: 'Space not found' }) })
      return
    }
    const items = await findMany<SpaceMemberRow>('space_members', {
      where: [{ field: 'space_id', operator: '=', value: params.data.spaceId }],
      orderBy: [{ field: 'added_at', direction: 'asc' }],
    })
    res.json(items)
  } catch (error) {
    internalError(res, error)
  }
})

router.post('/', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const params = spaceParam.safeParse(req.params)
  const body = addSchema.safeParse(req.body)
  if (!params.success || !body.success) {
    validationError(res, params.success ? body.error?.issues : params.error.issues)
    return
  }
  try {
    const space = await requireSpaceAdminAccess(params.data.spaceId, uid)
    if (!space) {
      res.status(404).json({ error: t('space.notFound', {}, { defaultValue: 'Space not found' }) })
      return
    }
    const result = await create<SpaceMemberRow>('space_members', {
      space_id: params.data.spaceId,
      user_id: body.data.user_id,
      role: body.data.role,
      added_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const params = memberIdParam.safeParse(req.params)
  if (!params.success) {
    validationError(res, params.error.issues)
    return
  }
  try {
    const space = await requireSpaceAdminAccess(params.data.spaceId, uid)
    if (!space) {
      res.status(404).json({ error: t('space.notFound', {}, { defaultValue: 'Space not found' }) })
      return
    }
    // Scope the deletion to the path space: confirm the target member row
    // actually belongs to THIS space before removing it. Without this, a
    // space-A admin could delete a member row from space B by its id (IDOR),
    // because requireSpaceAdminAccess only authorizes against the path space.
    const member = await findOne<SpaceMemberRow>('space_members', [
      { field: 'id', operator: '=', value: params.data.id },
      { field: 'space_id', operator: '=', value: params.data.spaceId },
    ])
    if (!member) {
      res
        .status(404)
        .json({ error: t('spaceMember.notFound', {}, { defaultValue: 'Member not found' }) })
      return
    }
    await deleteById('space_members', member.id)
    res.status(204).end()
  } catch (error) {
    internalError(res, error)
  }
})

export default router
