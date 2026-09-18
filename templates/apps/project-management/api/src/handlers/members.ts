import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  accessibleProjectIds,
  getUserId,
  projectIfAccessible,
  projectIfOwner,
} from './_ownership.js'

const router = Router()

const addMemberSchema = z.object({
  project_id: z.string().min(1),
  user_id: z.string().min(1),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).optional(),
})

interface MemberRow {
  id: string
  project_id: string
  user_id: string
  role?: string
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('member.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    const accessibleIds = await accessibleProjectIds(userId)
    if (accessibleIds.length === 0) {
      res.json([])
      return
    }

    const { project_id } = req.query
    let projectFilter = accessibleIds
    if (project_id && typeof project_id === 'string') {
      if (!accessibleIds.includes(project_id)) {
        res.json([])
        return
      }
      projectFilter = [project_id]
    }
    const where: WhereCondition[] = [{ field: 'project_id', operator: 'in', value: projectFilter }]

    const items = await findMany('project_members', {
      where,
      orderBy: [{ field: 'joined_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('members.list', error)
    res
      .status(500)
      .json({ error: t('member.error.list', {}, { defaultValue: 'Failed to list members' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('member.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    const parsed = addMemberSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues })
      return
    }

    // Only the project owner can add new members.
    const owned = await projectIfOwner(userId, parsed.data.project_id)
    if (!owned) {
      res
        .status(404)
        .json({ error: t('project.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }

    const existing = await findOne('project_members', [
      { field: 'project_id', operator: '=', value: parsed.data.project_id },
      { field: 'user_id', operator: '=', value: parsed.data.user_id },
    ])
    if (existing) {
      res
        .status(409)
        .json({ error: t('member.error.exists', {}, { defaultValue: 'User is already a member' }) })
      return
    }

    const result = await create('project_members', {
      ...parsed.data,
      role: parsed.data.role || 'member',
      joined_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('members.add', error)
    res
      .status(500)
      .json({ error: t('member.error.add', {}, { defaultValue: 'Failed to add member' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('member.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    const member = await findById<MemberRow>('project_members', req.params.id as string)
    if (!member) {
      res
        .status(404)
        .json({ error: t('member.notFound', {}, { defaultValue: 'Member not found' }) })
      return
    }

    // Owner can remove anyone; a member can remove themselves.
    const owned = await projectIfOwner(userId, member.project_id)
    if (!owned && member.user_id !== userId) {
      const access = await projectIfAccessible(userId, member.project_id)
      if (!access) {
        res
          .status(404)
          .json({ error: t('member.notFound', {}, { defaultValue: 'Member not found' }) })
        return
      }
      res
        .status(403)
        .json({ error: t('member.error.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }

    await deleteById('project_members', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('members.remove', error)
    res
      .status(500)
      .json({ error: t('member.error.remove', {}, { defaultValue: 'Failed to remove member' }) })
  }
})

export default router
