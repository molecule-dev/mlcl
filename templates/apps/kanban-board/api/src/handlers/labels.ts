/**
 * Label handlers — board-scoped CRUD for the per-board label palette.
 *
 * Labels exist within a board; ownership scopes by owner_id (mirroring
 * the board owner). The `card_labels` join is managed via the dedicated
 * `attach`/`detach` endpoints on this router so the UI can toggle a
 * label on a card without round-tripping through `cards.patch`.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  deleteMany,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const labelCreateSchema = z.object({
  board_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  color: z.string().max(7).optional(),
})

const labelUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  color: z.string().max(7).optional(),
})

const attachSchema = z.object({
  card_id: z.string().uuid(),
  label_id: z.string().uuid(),
})

const idParam = z.object({ id: z.string().uuid() })

interface BoardRow {
  id: string
  owner_id: string
}

interface LabelRow {
  id: string
  board_id: string
  owner_id: string
  name: string
  color: string
}

interface CardRow {
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
    const items = await findMany<LabelRow>('labels', {
      where: [
        { field: 'board_id', operator: '=', value: board.id },
        { field: 'owner_id', operator: '=', value: ownerId },
      ],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('label.list', error)
    res
      .status(500)
      .json({ error: t('label.error.list', {}, { defaultValue: 'Failed to list labels' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = labelCreateSchema.safeParse(req.body)
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
    const result = await create<LabelRow>('labels', {
      board_id: board.id,
      owner_id: ownerId,
      name: parsed.data.name,
      color: parsed.data.color ?? '#808080',
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('label.create', error)
    res
      .status(500)
      .json({ error: t('label.error.create', {}, { defaultValue: 'Failed to create label' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = labelUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<LabelRow>('labels', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('label.notFound', {}, { defaultValue: 'Label not found' }) })
      return
    }
    const result = await updateById<LabelRow>('labels', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('label.update', error)
    res
      .status(500)
      .json({ error: t('label.error.update', {}, { defaultValue: 'Failed to update label' }) })
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
    const owned = await findOne<LabelRow>('labels', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('label.notFound', {}, { defaultValue: 'Label not found' }) })
      return
    }
    await deleteById('labels', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('label.delete', error)
    res
      .status(500)
      .json({ error: t('label.error.delete', {}, { defaultValue: 'Failed to delete label' }) })
  }
})

router.post('/attach', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = attachSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  try {
    const card = await findOne<CardRow>('cards', [
      { field: 'id', operator: '=', value: parsed.data.card_id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!card) {
      res.status(404).json({ error: t('card.notFound', {}, { defaultValue: 'Card not found' }) })
      return
    }
    const label = await findOne<LabelRow>('labels', [
      { field: 'id', operator: '=', value: parsed.data.label_id },
      { field: 'owner_id', operator: '=', value: ownerId },
      { field: 'board_id', operator: '=', value: card.board_id },
    ])
    if (!label) {
      res.status(404).json({ error: t('label.notFound', {}, { defaultValue: 'Label not found' }) })
      return
    }
    const existing = await findOne('card_labels', [
      { field: 'card_id', operator: '=', value: card.id },
      { field: 'label_id', operator: '=', value: label.id },
    ])
    if (existing) {
      res.status(200).json({ attached: true })
      return
    }
    await create('card_labels', {
      card_id: card.id,
      label_id: label.id,
      owner_id: ownerId,
      created_at: new Date(),
    })
    res.status(201).json({ attached: true })
  } catch (error) {
    logger.error('label.attach', error)
    res
      .status(500)
      .json({ error: t('label.error.attach', {}, { defaultValue: 'Failed to attach label' }) })
  }
})

router.post('/detach', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = attachSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  try {
    const result = await deleteMany('card_labels', [
      { field: 'card_id', operator: '=', value: parsed.data.card_id },
      { field: 'label_id', operator: '=', value: parsed.data.label_id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    res.json({ detached: true, affected: result.affected })
  } catch (error) {
    logger.error('label.detach', error)
    res
      .status(500)
      .json({ error: t('label.error.detach', {}, { defaultValue: 'Failed to detach label' }) })
  }
})

export default router
