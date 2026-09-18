/**
 * List handlers — board-scoped CRUD for kanban columns.
 *
 * Each list belongs to a board; the board's owner_id is the
 * authoritative ownership root. Every mutation re-checks that the
 * acting user owns the parent board to prevent IDOR.
 *
 * Uses the abstract DataStore from @molecule/api-database.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  deleteMany,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { broadcast } from '@molecule/api-realtime'

import type { KanbanBoardLimits } from '../tiers.js'

const router = Router()

const listCreateSchema = z.object({
  board_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  position: z.number().optional(),
})

const listUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  position: z.number().optional(),
  is_archived: z.boolean().optional(),
})

const reorderSchema = z.object({
  board_id: z.string().uuid(),
  lists: z.array(z.object({ id: z.string().uuid(), position: z.number() })).min(1),
})

const idParam = z.object({ id: z.string().uuid() })

interface BoardRow {
  id: string
  owner_id: string
}

interface ListRow {
  id: string
  board_id: string
  owner_id: string
  name: string
  position: number
  is_archived: boolean
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
  const boardIdParse = z.object({ board_id: z.string().uuid() }).safeParse(req.query)
  if (!boardIdParse.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: boardIdParse.error.issues,
    })
    return
  }
  try {
    const board = await requireBoardOwner(res, boardIdParse.data.board_id, ownerId)
    if (!board) return
    const items = await findMany<ListRow>('board_lists', {
      where: [
        { field: 'board_id', operator: '=', value: board.id },
        { field: 'owner_id', operator: '=', value: ownerId },
      ],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('list.list', error)
    res
      .status(500)
      .json({ error: t('list.error.list', {}, { defaultValue: 'Failed to list lists' }) })
  }
})

router.post(
  '/',
  enforceLimit<KanbanBoardLimits>({
    limitType: 'maxLists',
    getLimit: (limits) => limits.maxLists,
    getCurrent: async (userId) =>
      count('board_lists', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    const ownerId = requireUser(res)
    if (!ownerId) return
    const parsed = listCreateSchema.safeParse(req.body)
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
      const next = parsed.data.position ?? (await getNextPosition(board.id, ownerId))
      const result = await create<ListRow>('board_lists', {
        board_id: board.id,
        owner_id: ownerId,
        name: parsed.data.name,
        position: next,
        is_archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      await broadcast(`board:${board.id}`, 'list:created', result.data).catch(() => undefined)
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('list.create', error)
      res
        .status(500)
        .json({ error: t('list.error.create', {}, { defaultValue: 'Failed to create list' }) })
    }
  },
)

router.post('/reorder', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = reorderSchema.safeParse(req.body)
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
    for (const item of parsed.data.lists) {
      const owned = await findOne<ListRow>('board_lists', [
        { field: 'id', operator: '=', value: item.id },
        { field: 'owner_id', operator: '=', value: ownerId },
        { field: 'board_id', operator: '=', value: board.id },
      ])
      if (!owned) continue
      await updateById<ListRow>('board_lists', item.id, {
        position: item.position,
        updated_at: new Date(),
      })
    }
    await broadcast(`board:${board.id}`, 'lists:reordered', parsed.data).catch(() => undefined)
    res.json({ reordered: true })
  } catch (error) {
    logger.error('list.reorder', error)
    res.status(500).json({
      error: t('list.error.reorder', {}, { defaultValue: 'Failed to reorder lists' }),
    })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = listUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<ListRow>('board_lists', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('list.notFound', {}, { defaultValue: 'List not found' }) })
      return
    }
    const result = await updateById<ListRow>('board_lists', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    await broadcast(`board:${owned.board_id}`, 'list:updated', result.data).catch(() => undefined)
    res.json(result.data)
  } catch (error) {
    logger.error('list.update', error)
    res
      .status(500)
      .json({ error: t('list.error.update', {}, { defaultValue: 'Failed to update list' }) })
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
    const owned = await findOne<ListRow>('board_lists', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('list.notFound', {}, { defaultValue: 'List not found' }) })
      return
    }
    // Delete the list's cards too. The cards.list_id FK is ON DELETE SET NULL, so without this
    // the cards survive as list_id=NULL orphans — invisible on the board (cards are grouped by
    // list and there's no backlog view) yet still counted in search/export. Card children
    // (comments/attachments/labels/checklists) cascade off cards.
    await deleteMany('cards', [{ field: 'list_id', operator: '=', value: id.data.id }])
    await deleteById('board_lists', id.data.id)
    await broadcast(`board:${owned.board_id}`, 'list:deleted', { id: id.data.id }).catch(
      () => undefined,
    )
    res.status(204).end()
  } catch (error) {
    logger.error('list.delete', error)
    res
      .status(500)
      .json({ error: t('list.error.delete', {}, { defaultValue: 'Failed to delete list' }) })
  }
})

const getNextPosition = async (boardId: string, ownerId: string): Promise<number> => {
  const lists = await findMany<ListRow>('board_lists', {
    where: [
      { field: 'board_id', operator: '=', value: boardId },
      { field: 'owner_id', operator: '=', value: ownerId },
    ],
    orderBy: [{ field: 'position', direction: 'desc' }],
    limit: 1,
  })
  return lists.length > 0 ? lists[0].position + 1 : 0
}

export default router
