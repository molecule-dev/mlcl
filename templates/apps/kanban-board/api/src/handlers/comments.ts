/**
 * Card comment handlers — card-scoped CRUD with @mention parsing.
 *
 * Comments use a per-app `card_comments` table (rather than the generic
 * `@molecule/api-resource-comment`) because we need an authoritative
 * ordering on (card_id, created_at) and an inline `mentions` jsonb
 * column derived from @username tokens at insert time.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const commentCreateSchema = z.object({
  card_id: z.string().uuid(),
  body: z.string().min(1).max(10_000),
})

const commentUpdateSchema = z.object({
  body: z.string().min(1).max(10_000),
})

const idParam = z.object({ id: z.string().uuid() })

interface CardRow {
  id: string
  board_id: string
  owner_id: string
}

interface CommentRow {
  id: string
  card_id: string
  owner_id: string
  author_id: string
  body: string
  mentions: string[]
  created_at: string
  updated_at: string
}

const extractMentions = (body: string): string[] => {
  const matches = body.match(/@([a-zA-Z0-9_-]+)/g) ?? []
  return Array.from(new Set(matches.map((m) => m.slice(1))))
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
    const items = await findMany<CommentRow>('card_comments', {
      where: [{ field: 'card_id', operator: '=', value: card.id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('comment.list', error)
    res.status(500).json({
      error: t('comment.error.list', {}, { defaultValue: 'Failed to list comments' }),
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = commentCreateSchema.safeParse(req.body)
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
    const result = await create<CommentRow>('card_comments', {
      card_id: card.id,
      owner_id: ownerId,
      author_id: ownerId,
      body: parsed.data.body,
      mentions: JSON.stringify(extractMentions(parsed.data.body)),
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('comment.create', error)
    res.status(500).json({
      error: t('comment.error.create', {}, { defaultValue: 'Failed to create comment' }),
    })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = commentUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<CommentRow>('card_comments', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'author_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({
        error: t('comment.notFound', {}, { defaultValue: 'Comment not found' }),
      })
      return
    }
    const result = await updateById<CommentRow>('card_comments', id.data.id, {
      body: body.data.body,
      mentions: JSON.stringify(extractMentions(body.data.body)),
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('comment.update', error)
    res.status(500).json({
      error: t('comment.error.update', {}, { defaultValue: 'Failed to update comment' }),
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
    const owned = await findOne<CommentRow>('card_comments', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'author_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({
        error: t('comment.notFound', {}, { defaultValue: 'Comment not found' }),
      })
      return
    }
    await deleteById('card_comments', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('comment.delete', error)
    res.status(500).json({
      error: t('comment.error.delete', {}, { defaultValue: 'Failed to delete comment' }),
    })
  }
})

export default router
