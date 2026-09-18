/**
 * Glossary terms handler — owner-scoped CRUD over `glossary_terms`. Terms
 * are global (per-user) by default; an optional `project_id` scopes a term
 * to a specific project. Non-owner reads return 404 to avoid existence
 * leaks.
 */
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const langCode = z.string().min(2).max(10)

const createTermSchema = z.object({
  source_lang: langCode.default('EN'),
  target_lang: langCode,
  source_term: z.string().min(1),
  target_term: z.string().min(1),
  notes: z.string().nullish(),
  project_id: z.string().min(1).nullish(),
})

const updateTermSchema = z.object({
  source_lang: langCode.optional(),
  target_lang: langCode.optional(),
  source_term: z.string().min(1).optional(),
  target_term: z.string().min(1).optional(),
  notes: z.string().nullish(),
  project_id: z.string().min(1).nullish(),
})

const listQuerySchema = z.object({
  project_id: z.string().min(1).optional(),
  source_lang: langCode.optional(),
  target_lang: langCode.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
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
    if (q.project_id) where.push({ field: 'project_id', operator: '=', value: q.project_id })
    if (q.source_lang) where.push({ field: 'source_lang', operator: '=', value: q.source_lang })
    if (q.target_lang) where.push({ field: 'target_lang', operator: '=', value: q.target_lang })
    const rows = await findMany('glossary_terms', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: q.limit,
      offset: q.offset,
    })
    res.json(rows)
  } catch (error) {
    logger.error('glossary.list', error)
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
    const term = await findById<Record<string, unknown>>('glossary_terms', id)
    if (!term || term.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('glossary.notFound', {}, { defaultValue: 'Term not found' }) })
      return
    }
    res.json(term)
  } catch (error) {
    logger.error('glossary.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createTermSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createTermSchema>
    const result = await create('glossary_terms', {
      user_id: userId,
      project_id: body.project_id ?? null,
      source_lang: body.source_lang,
      target_lang: body.target_lang,
      source_term: body.source_term,
      target_term: body.target_term,
      notes: body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('glossary.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateTermSchema),
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
      const existing = await findById<Record<string, unknown>>('glossary_terms', id)
      if (!existing || existing.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('glossary.notFound', {}, { defaultValue: 'Term not found' }) })
        return
      }
      const body = req.body as z.infer<typeof updateTermSchema>
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (body.source_lang !== undefined) updates.source_lang = body.source_lang
      if (body.target_lang !== undefined) updates.target_lang = body.target_lang
      if (body.source_term !== undefined) updates.source_term = body.source_term
      if (body.target_term !== undefined) updates.target_term = body.target_term
      if (body.notes !== undefined) updates.notes = body.notes
      if (body.project_id !== undefined) updates.project_id = body.project_id
      const result = await updateById('glossary_terms', id, updates)
      res.json(result.data)
    } catch (error) {
      logger.error('glossary.update', error)
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
    const existing = await findById<Record<string, unknown>>('glossary_terms', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('glossary.notFound', {}, { defaultValue: 'Term not found' }) })
      return
    }
    await deleteById('glossary_terms', id)
    res.status(204).end()
  } catch (error) {
    logger.error('glossary.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
