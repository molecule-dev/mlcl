/**
 * Card attachment handlers — minimal CRUD over `card_attachments`.
 *
 * The actual upload to S3 (or any uploads bond) is the client's
 * responsibility; this handler records the resulting metadata and lets
 * the UI list/detach the row. owner_id mirrors the card owner; we
 * verify card ownership before allowing a write.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const attachmentCreateSchema = z.object({
  card_id: z.string().uuid(),
  file_url: z.string().min(1).max(2000),
  file_name: z.string().min(1).max(500),
  mime: z.string().max(255).optional(),
  size: z.number().int().nonnegative().optional(),
})

const idParam = z.object({ id: z.string().uuid() })

interface CardRow {
  id: string
  board_id: string
  owner_id: string
}

interface AttachmentRow {
  id: string
  card_id: string
  owner_id: string
  uploaded_by: string
  file_url: string
  file_name: string
  mime: string | null
  size: number | null
  created_at: string
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
    const items = await findMany<AttachmentRow>('card_attachments', {
      where: [{ field: 'card_id', operator: '=', value: card.id }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('attachment.list', error)
    res.status(500).json({
      error: t('attachment.error.list', {}, { defaultValue: 'Failed to list attachments' }),
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = attachmentCreateSchema.safeParse(req.body)
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
    const result = await create<AttachmentRow>('card_attachments', {
      card_id: card.id,
      owner_id: ownerId,
      uploaded_by: ownerId,
      file_url: parsed.data.file_url,
      file_name: parsed.data.file_name,
      mime: parsed.data.mime ?? null,
      size: parsed.data.size ?? null,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('attachment.create', error)
    res.status(500).json({
      error: t('attachment.error.create', {}, { defaultValue: 'Failed to record attachment' }),
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
    const owned = await findOne<AttachmentRow>('card_attachments', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({
        error: t('attachment.notFound', {}, { defaultValue: 'Attachment not found' }),
      })
      return
    }
    await deleteById('card_attachments', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('attachment.delete', error)
    res.status(500).json({
      error: t('attachment.error.delete', {}, { defaultValue: 'Failed to delete attachment' }),
    })
  }
})

export default router
