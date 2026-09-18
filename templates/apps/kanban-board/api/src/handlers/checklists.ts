/**
 * Checklist handlers — card-scoped CRUD for cards' checklists + items.
 *
 * Each checklist belongs to a card; ownership lives on owner_id (the
 * board owner). Checklist items belong to a checklist; same scope.
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

const checklistCreateSchema = z.object({
  card_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  position: z.number().optional(),
})

const checklistUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  position: z.number().optional(),
})

const itemCreateSchema = z.object({
  checklist_id: z.string().uuid(),
  text: z.string().min(1).max(2000),
  position: z.number().optional(),
})

const itemUpdateSchema = z.object({
  text: z.string().min(1).max(2000).optional(),
  is_done: z.boolean().optional(),
  position: z.number().optional(),
})

const idParam = z.object({ id: z.string().uuid() })

interface CardRow {
  id: string
  board_id: string
  owner_id: string
}

interface ChecklistRow {
  id: string
  card_id: string
  owner_id: string
  title: string
  position: number
}

interface ItemRow {
  id: string
  checklist_id: string
  owner_id: string
  text: string
  is_done: boolean
  position: number
}

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = z.object({ card_id: z.string().uuid() }).safeParse(req.query)
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
    const checklists = await findMany<ChecklistRow>('checklists', {
      where: [
        { field: 'card_id', operator: '=', value: card.id },
        { field: 'owner_id', operator: '=', value: ownerId },
      ],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    const ids = checklists.map((c) => c.id)
    const items =
      ids.length === 0
        ? []
        : await findMany<ItemRow>('checklist_items', {
            where: [{ field: 'checklist_id', operator: 'in', value: ids }],
            orderBy: [{ field: 'position', direction: 'asc' }],
          })
    const grouped = checklists.map((c) => ({
      ...c,
      items: items.filter((i) => i.checklist_id === c.id),
    }))
    res.json(grouped)
  } catch (error) {
    logger.error('checklist.list', error)
    res.status(500).json({
      error: t('checklist.error.list', {}, { defaultValue: 'Failed to list checklists' }),
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = checklistCreateSchema.safeParse(req.body)
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
    const result = await create<ChecklistRow>('checklists', {
      card_id: card.id,
      owner_id: ownerId,
      title: parsed.data.title,
      position: parsed.data.position ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('checklist.create', error)
    res.status(500).json({
      error: t('checklist.error.create', {}, { defaultValue: 'Failed to create checklist' }),
    })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = checklistUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<ChecklistRow>('checklists', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({
        error: t('checklist.notFound', {}, { defaultValue: 'Checklist not found' }),
      })
      return
    }
    const result = await updateById<ChecklistRow>('checklists', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('checklist.update', error)
    res.status(500).json({
      error: t('checklist.error.update', {}, { defaultValue: 'Failed to update checklist' }),
    })
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
    const owned = await findOne<ChecklistRow>('checklists', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({
        error: t('checklist.notFound', {}, { defaultValue: 'Checklist not found' }),
      })
      return
    }
    await deleteMany('checklist_items', [
      { field: 'checklist_id', operator: '=', value: id.data.id },
    ])
    await deleteById('checklists', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('checklist.delete', error)
    res.status(500).json({
      error: t('checklist.error.delete', {}, { defaultValue: 'Failed to delete checklist' }),
    })
  }
})

router.post('/items', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = itemCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  try {
    const checklist = await findOne<ChecklistRow>('checklists', [
      { field: 'id', operator: '=', value: parsed.data.checklist_id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!checklist) {
      res.status(404).json({
        error: t('checklist.notFound', {}, { defaultValue: 'Checklist not found' }),
      })
      return
    }
    const result = await create<ItemRow>('checklist_items', {
      checklist_id: checklist.id,
      owner_id: ownerId,
      text: parsed.data.text,
      is_done: false,
      position: parsed.data.position ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('checklist.itemCreate', error)
    res.status(500).json({
      error: t('checklist.error.itemCreate', {}, { defaultValue: 'Failed to create item' }),
    })
  }
})

router.patch('/items/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = itemUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<ItemRow>('checklist_items', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({
        error: t('checklist.itemNotFound', {}, { defaultValue: 'Item not found' }),
      })
      return
    }
    const result = await updateById<ItemRow>('checklist_items', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('checklist.itemUpdate', error)
    res.status(500).json({
      error: t('checklist.error.itemUpdate', {}, { defaultValue: 'Failed to update item' }),
    })
  }
})

router.delete('/items/:id', async (req: Request, res: Response) => {
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
    const owned = await findOne<ItemRow>('checklist_items', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({
        error: t('checklist.itemNotFound', {}, { defaultValue: 'Item not found' }),
      })
      return
    }
    await deleteById('checklist_items', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('checklist.itemDelete', error)
    res.status(500).json({
      error: t('checklist.error.itemDelete', {}, { defaultValue: 'Failed to delete item' }),
    })
  }
})

export default router
