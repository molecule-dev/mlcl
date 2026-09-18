import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createEntrySchema = z.object({
  title: z.string().optional(),
  body: z.string().min(1),
  session_id: z.string().nullable().optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  tags: z.array(z.string()).optional(),
  written_at: z.string().optional(),
})

const updateEntrySchema = createEntrySchema.partial()

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const { limit, offset } = req.query
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'written_at', direction: 'desc' }]
    const entries = await findMany('journal_entries', {
      where,
      orderBy,
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
    })
    res.json(entries)
  } catch (error) {
    logger.error('journal.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const entry = await findById<Record<string, unknown>>('journal_entries', id)
    if (!entry || entry.user_id !== userId) {
      return res.status(404).json({
        error: t('journal.notFound', {}, { defaultValue: 'Journal entry not found' }),
      })
    }
    res.json(entry)
  } catch (error) {
    logger.error('journal.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createEntrySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const body = req.body as z.infer<typeof createEntrySchema>
    const writtenAt = body.written_at ? new Date(body.written_at) : new Date()

    const result = await create('journal_entries', {
      user_id: userId,
      session_id: body.session_id ?? null,
      title: body.title ?? null,
      body: body.body,
      mood: body.mood ?? null,
      tags: JSON.stringify(body.tags ?? []),
      written_at: writtenAt,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('journal.create', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updateEntrySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('journal_entries', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('journal.notFound', {}, { defaultValue: 'Journal entry not found' }),
      })
    }

    const body = req.body as Partial<z.infer<typeof createEntrySchema>>
    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.body !== undefined) updates.body = body.body
    if (body.mood !== undefined) updates.mood = body.mood
    if (body.session_id !== undefined) updates.session_id = body.session_id
    if (body.tags !== undefined) updates.tags = JSON.stringify(body.tags)
    if (body.written_at !== undefined) updates.written_at = new Date(body.written_at)
    updates.updatedAt = new Date()

    const result = await updateById('journal_entries', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('journal.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('journal_entries', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('journal.notFound', {}, { defaultValue: 'Journal entry not found' }),
      })
    }
    await deleteById('journal_entries', id)
    res.status(204).end()
  } catch (error) {
    logger.error('journal.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
