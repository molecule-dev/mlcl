/**
 * Translation memory handler — owner-scoped CRUD over `memory_entries`,
 * plus a `/suggest` endpoint that performs cheap exact / Postgres-FTS
 * fallback lookup against prior translations to power TM reuse on the
 * Translate editor.
 *
 * Embedding-based fuzzy match is INVENTORY's "deferred" v2 — `/suggest`
 * here is intentionally simple (exact match by source+lang pair, ordered
 * by `used_count` then recency).
 */
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const langCode = z.string().min(2).max(10)

const createEntrySchema = z.object({
  source_lang: langCode.default('EN'),
  target_lang: langCode,
  source_text: z.string().min(1),
  target_text: z.string().min(1),
})

const updateEntrySchema = z.object({
  source_lang: langCode.optional(),
  target_lang: langCode.optional(),
  source_text: z.string().min(1).optional(),
  target_text: z.string().min(1).optional(),
})

const listQuerySchema = z.object({
  source_lang: langCode.optional(),
  target_lang: langCode.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})

const suggestSchema = z.object({
  source_text: z.string().min(1),
  source_lang: langCode.optional(),
  target_lang: langCode,
  limit: z.coerce.number().int().min(1).max(20).default(5),
})

router.get('/', validateQuery(listQuerySchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const q = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (q.source_lang) where.push({ field: 'source_lang', operator: '=', value: q.source_lang })
    if (q.target_lang) where.push({ field: 'target_lang', operator: '=', value: q.target_lang })
    const rows = await findMany('memory_entries', {
      where,
      orderBy: [
        { field: 'last_used_at', direction: 'desc' },
        { field: 'updated_at', direction: 'desc' },
      ],
      limit: q.limit,
      offset: q.offset,
    })
    res.json(rows)
  } catch (error) {
    logger.error('memory.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const entry = await findById<Record<string, unknown>>('memory_entries', id)
    if (!entry || entry.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('memory.notFound', {}, { defaultValue: 'Memory entry not found' }) })
      return
    }
    res.json(entry)
  } catch (error) {
    logger.error('memory.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createEntrySchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createEntrySchema>
    // A translation memory holds one entry per (source_lang, target_lang, source_text) per
    // user. Recording the same source again is a REUSE: bump used_count (which /suggest ranks
    // by), refresh last_used_at + the target, and return the existing entry instead of piling
    // up duplicate suggestions. Without this, used_count and last_used_at were NEVER set, so
    // the /suggest ordering (used_count desc, last_used_at desc) was meaningless.
    const existing = await findOne<Record<string, unknown>>('memory_entries', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'source_lang', operator: '=', value: body.source_lang },
      { field: 'target_lang', operator: '=', value: body.target_lang },
      { field: 'source_text', operator: '=', value: body.source_text },
    ])
    if (existing) {
      const updated = await updateById('memory_entries', String(existing.id), {
        target_text: body.target_text,
        used_count: (Number(existing.used_count) || 0) + 1,
        last_used_at: new Date(),
        updated_at: new Date(),
      })
      res.status(200).json(updated.data ?? existing)
      return
    }
    const result = await create('memory_entries', {
      user_id: userId,
      source_lang: body.source_lang,
      target_lang: body.target_lang,
      source_text: body.source_text,
      target_text: body.target_text,
      used_count: 0,
      last_used_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('memory.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateEntrySchema),
  async (req, res) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const id = getParamId(req)
      const existing = await findById<Record<string, unknown>>('memory_entries', id)
      if (!existing || existing.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('memory.notFound', {}, { defaultValue: 'Memory entry not found' }) })
        return
      }
      const body = req.body as z.infer<typeof updateEntrySchema>
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (body.source_lang !== undefined) updates.source_lang = body.source_lang
      if (body.target_lang !== undefined) updates.target_lang = body.target_lang
      if (body.source_text !== undefined) updates.source_text = body.source_text
      if (body.target_text !== undefined) updates.target_text = body.target_text
      const result = await updateById('memory_entries', id, updates)
      res.json(result.data)
    } catch (error) {
      logger.error('memory.update', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('memory_entries', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('memory.notFound', {}, { defaultValue: 'Memory entry not found' }) })
      return
    }
    await deleteById('memory_entries', id)
    res.status(204).end()
  } catch (error) {
    logger.error('memory.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/suggest', validateBody(suggestSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof suggestSchema>
    const where: WhereCondition[] = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'target_lang', operator: '=', value: body.target_lang },
      { field: 'source_text', operator: '=', value: body.source_text },
    ]
    if (body.source_lang) {
      where.push({ field: 'source_lang', operator: '=', value: body.source_lang })
    }
    const matches = await findMany('memory_entries', {
      where,
      orderBy: [
        { field: 'used_count', direction: 'desc' },
        { field: 'last_used_at', direction: 'desc' },
      ],
      limit: body.limit,
    })
    res.json({ matches })
  } catch (error) {
    logger.error('memory.suggest', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
