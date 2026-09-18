/**
 * Board handlers — owner-scoped CRUD for kanban boards.
 *
 * Every read/write filters by `owner_id = session.userId` so cross-user
 * IDOR attempts return 404 rather than leaking data. Board creation is
 * gated by `enforceLimit` against `KanbanBoardLimits.maxBoards`.
 *
 * Uses the abstract DataStore from @molecule/api-database (no raw SQL).
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findMany,
  findOne,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import type { KanbanBoardLimits } from '../tiers.js'

const router = Router()

const boardCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  background_color: z.string().max(7).optional(),
  position: z.number().optional(),
})

const boardUpdateSchema = boardCreateSchema.partial().extend({
  is_starred: z.boolean().optional(),
  is_archived: z.boolean().optional(),
})

const idParam = z.object({ id: z.string().uuid() })

interface BoardRow {
  id: string
  owner_id: string
  name: string
  description: string | null
  background_color: string
  is_starred: boolean
  is_archived: boolean
  position: number
  created_at: string
  updated_at: string
}

interface BoardListRow {
  id: string
  board_id: string
  owner_id: string
  name: string
  position: number
  is_archived: boolean
}

interface CardRow {
  id: string
  board_id: string
  list_id: string | null
  owner_id: string
  position: number
  is_archived: boolean
}

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: ownerId }]
    if (req.query.archived === 'true') {
      where.push({ field: 'is_archived', operator: '=', value: true })
    } else if (req.query.archived !== 'all') {
      where.push({ field: 'is_archived', operator: '=', value: false })
    }
    const items = await findMany<BoardRow>('boards', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('board.list', error)
    res
      .status(500)
      .json({ error: t('board.error.list', {}, { defaultValue: 'Failed to list boards' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
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
    const board = await findOne<BoardRow>('boards', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!board) {
      res.status(404).json({ error: t('board.notFound', {}, { defaultValue: 'Board not found' }) })
      return
    }
    const lists = await findMany<BoardListRow>('board_lists', {
      where: [
        { field: 'board_id', operator: '=', value: board.id },
        { field: 'is_archived', operator: '=', value: false },
      ],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    const listIds = lists.map((l) => l.id)
    const cards =
      listIds.length === 0
        ? []
        : await findMany<CardRow>('cards', {
            where: [
              { field: 'list_id', operator: 'in', value: listIds },
              { field: 'is_archived', operator: '=', value: false },
            ],
            orderBy: [{ field: 'position', direction: 'asc' }],
          })
    const listsWithCards = lists.map((list) => ({
      ...list,
      cards: cards.filter((c) => c.list_id === list.id),
    }))
    res.json({ ...board, lists: listsWithCards })
  } catch (error) {
    logger.error('board.read', error)
    res
      .status(500)
      .json({ error: t('board.error.read', {}, { defaultValue: 'Failed to read board' }) })
  }
})

router.post(
  '/',
  enforceLimit<KanbanBoardLimits>({
    limitType: 'maxBoards',
    getLimit: (limits) => limits.maxBoards,
    getCurrent: async (userId) =>
      count('boards', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    const ownerId = requireUser(res)
    if (!ownerId) return
    const parsed = boardCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
        issues: parsed.error.issues,
      })
      return
    }
    try {
      const result = await create<BoardRow>('boards', {
        owner_id: ownerId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        background_color: parsed.data.background_color ?? '#0079bf',
        is_starred: false,
        is_archived: false,
        position: parsed.data.position ?? 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('board.create', error)
      res
        .status(500)
        .json({ error: t('board.error.create', {}, { defaultValue: 'Failed to create board' }) })
    }
  },
)

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = boardUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<BoardRow>('boards', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('board.notFound', {}, { defaultValue: 'Board not found' }) })
      return
    }
    const result = await updateById<BoardRow>('boards', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('board.update', error)
    res
      .status(500)
      .json({ error: t('board.error.update', {}, { defaultValue: 'Failed to update board' }) })
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
    const owned = await findOne<BoardRow>('boards', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('board.notFound', {}, { defaultValue: 'Board not found' }) })
      return
    }
    await deleteById('boards', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('board.delete', error)
    res
      .status(500)
      .json({ error: t('board.error.delete', {}, { defaultValue: 'Failed to delete board' }) })
  }
})

export default router
