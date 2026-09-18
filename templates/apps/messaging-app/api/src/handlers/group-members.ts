/**
 * Convenience endpoint for the GroupDetail page:
 *
 *   GET /api/group-members?group_id=<id>
 *
 * Returns members of the group decorated with display name + initials +
 * avatar_index. Auth-required and gated by group membership so the
 * member list of a group you don't belong to is not enumerable.
 */

import { type Request, type Response, Router } from 'express'

import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { requireGroupMembership } from '../lib/authz.js'
import { decorateGroupMembers, type RawMember } from './_decorate.js'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  const groupId = req.query.group_id ? String(req.query.group_id) : ''
  if (!groupId) {
    res.status(400).json({
      error: t('groups.groupIdRequired', undefined, {
        defaultValue: 'group_id query parameter required',
      }),
    })
    return
  }
  const auth = await requireGroupMembership(groupId, userId)
  if (!auth.ok) {
    res
      .status(404)
      .json({ error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }) })
    return
  }
  const members = await findMany<RawMember>('group_members', {
    where: [{ field: 'group_id', operator: '=', value: groupId }],
    orderBy: [{ field: 'joined_at', direction: 'asc' }],
    limit: 500,
  })
  res.json(await decorateGroupMembers(members))
})

export default router
