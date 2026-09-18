/**
 * Board member handlers — invite/list/role-change/revoke board members.
 *
 * Only the board owner may invite or revoke. Members are visible to
 * the board owner and to themselves. v1 ships with a single
 * per-user workspace — multi-workspace is deferred to Phase 3+.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findMany,
  findOne,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const inviteSchema = z.object({
  board_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(['viewer', 'member', 'admin']).optional(),
})

const updateRoleSchema = z.object({
  role: z.enum(['viewer', 'member', 'admin']),
})

const idParam = z.object({ id: z.string().uuid() })

interface BoardRow {
  id: string
  owner_id: string
}

interface MemberRow {
  id: string
  board_id: string
  user_id: string
  invited_by: string | null
  role: string
  accepted_at: string | null
}

const requireBoardOwner = async (
  res: Response,
  boardId: string,
  ownerId: string,
): Promise<BoardRow | null> => {
  const board = await findOne<BoardRow>('boards', [
    { field: 'id', operator: '=', value: boardId },
    { field: 'owner_id', operator: '=', value: ownerId },
  ])
  if (!board) {
    res.status(404).json({ error: t('board.notFound', {}, { defaultValue: 'Board not found' }) })
    return null
  }
  return board
}

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = z.object({ board_id: z.string().uuid() }).safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  try {
    const board = await requireBoardOwner(res, parsed.data.board_id, ownerId)
    if (!board) return
    const where: WhereCondition[] = [{ field: 'board_id', operator: '=', value: board.id }]
    const items = await findMany<MemberRow>('board_members', {
      where,
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('member.list', error)
    res
      .status(500)
      .json({ error: t('member.error.list', {}, { defaultValue: 'Failed to list members' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = inviteSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  try {
    const board = await requireBoardOwner(res, parsed.data.board_id, ownerId)
    if (!board) return
    const existing = await findOne<MemberRow>('board_members', [
      { field: 'board_id', operator: '=', value: board.id },
      { field: 'user_id', operator: '=', value: parsed.data.user_id },
    ])
    if (existing) {
      res.status(409).json({
        error: t('member.error.exists', {}, { defaultValue: 'User is already a member' }),
      })
      return
    }
    const result = await create<MemberRow>('board_members', {
      board_id: board.id,
      user_id: parsed.data.user_id,
      invited_by: ownerId,
      role: parsed.data.role ?? 'member',
      accepted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('member.invite', error)
    res
      .status(500)
      .json({ error: t('member.error.invite', {}, { defaultValue: 'Failed to invite member' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = updateRoleSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const member = await findOne<MemberRow>('board_members', [
      { field: 'id', operator: '=', value: id.data.id },
    ])
    if (!member) {
      res.status(404).json({
        error: t('member.notFound', {}, { defaultValue: 'Member not found' }),
      })
      return
    }
    const board = await requireBoardOwner(res, member.board_id, ownerId)
    if (!board) return
    const result = await updateById<MemberRow>('board_members', id.data.id, {
      role: body.data.role,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('member.update', error)
    res
      .status(500)
      .json({ error: t('member.error.update', {}, { defaultValue: 'Failed to update member' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: id.error.issues,
    })
    return
  }
  try {
    const member = await findOne<MemberRow>('board_members', [
      { field: 'id', operator: '=', value: id.data.id },
    ])
    if (!member) {
      res.status(404).json({
        error: t('member.notFound', {}, { defaultValue: 'Member not found' }),
      })
      return
    }
    const board = await requireBoardOwner(res, member.board_id, ownerId)
    if (!board) return
    await deleteById('board_members', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('member.delete', error)
    res
      .status(500)
      .json({ error: t('member.error.delete', {}, { defaultValue: 'Failed to remove member' }) })
  }
})

export default router
