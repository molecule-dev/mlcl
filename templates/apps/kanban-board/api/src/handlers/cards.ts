/**
 * Card handlers — owner-scoped CRUD with archive + move/reorder.
 *
 * Each card belongs to a board (and optionally a list); ownership lives
 * on the card via owner_id, mirroring the board owner. Every mutation
 * verifies ownership before acting to prevent IDOR.
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
  findMany,
  findOne,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { broadcast } from '@molecule/api-realtime'

import type { KanbanBoardLimits } from '../tiers.js'

const router = Router()

const cardCreateSchema = z.object({
  board_id: z.string().uuid(),
  list_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(1000),
  description: z.unknown().optional(),
  due_date: z.string().nullable().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  position: z.number().optional(),
})

const cardUpdateSchema = z.object({
  title: z.string().min(1).max(1000).optional(),
  description: z.unknown().optional(),
  due_date: z.string().nullable().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  list_id: z.string().uuid().nullable().optional(),
  position: z.number().optional(),
  is_archived: z.boolean().optional(),
})

const moveSchema = z.object({
  list_id: z.string().uuid().nullable(),
  position: z.number(),
})

const idParam = z.object({ id: z.string().uuid() })

interface BoardRow {
  id: string
  owner_id: string
}

interface CardRow {
  id: string
  board_id: string
  list_id: string | null
  owner_id: string
  creator_id: string
  assignee_id: string | null
  title: string
  description: unknown
  due_date: string | null
  priority: string
  position: number
  is_archived: boolean
  created_at: string
  updated_at: string
}

interface ListRow {
  id: string
  board_id: string
  owner_id: string
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
  try {
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: ownerId }]
    const { board_id, list_id, assignee_id, archived } = req.query
    if (typeof board_id === 'string' && board_id) {
      where.push({ field: 'board_id', operator: '=', value: board_id })
    }
    if (list_id === 'null') {
      where.push({ field: 'list_id', operator: 'is_null' })
    } else if (typeof list_id === 'string' && list_id) {
      where.push({ field: 'list_id', operator: '=', value: list_id })
    }
    if (typeof assignee_id === 'string' && assignee_id) {
      where.push({ field: 'assignee_id', operator: '=', value: assignee_id })
    }
    if (archived === 'true') {
      where.push({ field: 'is_archived', operator: '=', value: true })
    } else if (archived !== 'all') {
      where.push({ field: 'is_archived', operator: '=', value: false })
    }
    const items = await findMany<CardRow>('cards', {
      where,
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('card.list', error)
    res
      .status(500)
      .json({ error: t('card.error.list', {}, { defaultValue: 'Failed to list cards' }) })
  }
})

router.get('/backlog', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const items = await findMany<CardRow>('cards', {
      where: [
        { field: 'owner_id', operator: '=', value: ownerId },
        { field: 'list_id', operator: 'is_null' },
        { field: 'is_archived', operator: '=', value: false },
      ],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('card.backlog', error)
    res
      .status(500)
      .json({ error: t('card.error.list', {}, { defaultValue: 'Failed to list cards' }) })
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
    const card = await findOne<CardRow>('cards', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!card) {
      res.status(404).json({ error: t('card.notFound', {}, { defaultValue: 'Card not found' }) })
      return
    }
    res.json(card)
  } catch (error) {
    logger.error('card.read', error)
    res
      .status(500)
      .json({ error: t('card.error.read', {}, { defaultValue: 'Failed to read card' }) })
  }
})

router.post(
  '/',
  enforceLimit<KanbanBoardLimits>({
    limitType: 'maxCards',
    getLimit: (limits) => limits.maxCards,
    getCurrent: async (userId) =>
      count('cards', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    const ownerId = requireUser(res)
    if (!ownerId) return
    const parsed = cardCreateSchema.safeParse(req.body)
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
      if (parsed.data.list_id) {
        const list = await findOne<ListRow>('board_lists', [
          { field: 'id', operator: '=', value: parsed.data.list_id },
          { field: 'owner_id', operator: '=', value: ownerId },
          { field: 'board_id', operator: '=', value: board.id },
        ])
        if (!list) {
          res
            .status(404)
            .json({ error: t('list.notFound', {}, { defaultValue: 'List not found' }) })
          return
        }
      }
      const next =
        parsed.data.position ?? (await getNextPosition(parsed.data.list_id ?? null, ownerId))
      const result = await create<CardRow>('cards', {
        board_id: board.id,
        list_id: parsed.data.list_id ?? null,
        owner_id: ownerId,
        creator_id: ownerId,
        assignee_id: parsed.data.assignee_id ?? null,
        title: parsed.data.title,
        description: parsed.data.description ?? {},
        due_date: parsed.data.due_date ?? null,
        priority: parsed.data.priority ?? 'normal',
        position: next,
        is_archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      await broadcast(`board:${board.id}`, 'card:created', result.data).catch(() => undefined)
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('card.create', error)
      res
        .status(500)
        .json({ error: t('card.error.create', {}, { defaultValue: 'Failed to create card' }) })
    }
  },
)

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = cardUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<CardRow>('cards', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('card.notFound', {}, { defaultValue: 'Card not found' }) })
      return
    }
    const result = await updateById<CardRow>('cards', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    await broadcast(`board:${owned.board_id}`, 'card:updated', result.data).catch(() => undefined)

    // Notify a newly-assigned board member. The notifications table, feed endpoint and
    // bell all exist, but nothing ever created a row — so the feed was always empty. Fire
    // only when assignee_id actually CHANGED to someone other than the person making the
    // change (skip self-assignment). Best-effort: never let it break the card update.
    const newAssignee = body.data.assignee_id
    if (newAssignee && newAssignee !== owned.assignee_id && newAssignee !== ownerId) {
      await create('notifications', {
        user_id: newAssignee,
        type: 'card_assigned',
        title: t('notifications.cardAssigned', {}, { defaultValue: 'You were assigned a card' }),
        body: String(result.data?.title ?? owned.title ?? ''),
        data: { card_id: id.data.id, board_id: owned.board_id },
      }).catch(() => undefined)
    }
    res.json(result.data)
  } catch (error) {
    logger.error('card.update', error)
    res
      .status(500)
      .json({ error: t('card.error.update', {}, { defaultValue: 'Failed to update card' }) })
  }
})

router.post('/:id/move', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = moveSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<CardRow>('cards', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('card.notFound', {}, { defaultValue: 'Card not found' }) })
      return
    }
    if (body.data.list_id) {
      const list = await findOne<ListRow>('board_lists', [
        { field: 'id', operator: '=', value: body.data.list_id },
        { field: 'owner_id', operator: '=', value: ownerId },
        { field: 'board_id', operator: '=', value: owned.board_id },
      ])
      if (!list) {
        res.status(404).json({ error: t('list.notFound', {}, { defaultValue: 'List not found' }) })
        return
      }
    }
    const result = await updateById<CardRow>('cards', id.data.id, {
      list_id: body.data.list_id,
      position: body.data.position,
      updated_at: new Date(),
    })
    await broadcast(`board:${owned.board_id}`, 'card:moved', {
      id: id.data.id,
      list_id: body.data.list_id,
      position: body.data.position,
    }).catch(() => undefined)
    res.json(result.data)
  } catch (error) {
    logger.error('card.move', error)
    res
      .status(500)
      .json({ error: t('card.error.move', {}, { defaultValue: 'Failed to move card' }) })
  }
})

router.post('/:id/archive', async (req: Request, res: Response) => {
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
    const owned = await findOne<CardRow>('cards', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('card.notFound', {}, { defaultValue: 'Card not found' }) })
      return
    }
    await updateById<CardRow>('cards', id.data.id, {
      is_archived: true,
      updated_at: new Date(),
    })
    await broadcast(`board:${owned.board_id}`, 'card:archived', { id: id.data.id }).catch(
      () => undefined,
    )
    res.json({ archived: true })
  } catch (error) {
    logger.error('card.archive', error)
    res
      .status(500)
      .json({ error: t('card.error.archive', {}, { defaultValue: 'Failed to archive card' }) })
  }
})

router.post('/:id/unarchive', async (req: Request, res: Response) => {
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
    const owned = await findOne<CardRow>('cards', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('card.notFound', {}, { defaultValue: 'Card not found' }) })
      return
    }
    await updateById<CardRow>('cards', id.data.id, {
      is_archived: false,
      updated_at: new Date(),
    })
    await broadcast(`board:${owned.board_id}`, 'card:unarchived', { id: id.data.id }).catch(
      () => undefined,
    )
    res.json({ archived: false })
  } catch (error) {
    logger.error('card.unarchive', error)
    res
      .status(500)
      .json({ error: t('card.error.unarchive', {}, { defaultValue: 'Failed to unarchive card' }) })
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
    const owned = await findOne<CardRow>('cards', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('card.notFound', {}, { defaultValue: 'Card not found' }) })
      return
    }
    await deleteById('cards', id.data.id)
    await broadcast(`board:${owned.board_id}`, 'card:deleted', { id: id.data.id }).catch(
      () => undefined,
    )
    res.status(204).end()
  } catch (error) {
    logger.error('card.delete', error)
    res
      .status(500)
      .json({ error: t('card.error.delete', {}, { defaultValue: 'Failed to delete card' }) })
  }
})

const getNextPosition = async (listId: string | null, ownerId: string): Promise<number> => {
  const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: ownerId }]
  if (listId) {
    where.push({ field: 'list_id', operator: '=', value: listId })
  } else {
    where.push({ field: 'list_id', operator: 'is_null' })
  }
  const cards = await findMany<CardRow>('cards', {
    where,
    orderBy: [{ field: 'position', direction: 'desc' }],
    limit: 1,
  })
  return cards.length > 0 ? cards[0].position + 1 : 0
}

export default router
