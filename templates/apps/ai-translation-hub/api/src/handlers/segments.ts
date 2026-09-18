/**
 * Translation segments handler — exposes segment-level CRUD plus inline
 * comments for review. Segments are owned via `user_id`; non-owner reads
 * return 404 to prevent existence leaks (per INVENTORY's authorization
 * rules).
 *
 * Segment translation (text + AI suggest) lives in `translations.ts`; this
 * module is purely the persistence + comment-thread surface.
 */
import { type RequestHandler, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { AiTranslationHubLimits } from '../tiers.js'

const router = Router()

const langCode = z.string().min(2).max(10)

const createSegmentSchema = z.object({
  project_id: z.string().min(1),
  source_text: z.string().min(1),
  source_lang: langCode.default('EN'),
  target_lang: langCode,
  position: z.number().int().min(0).default(0),
  file_id: z.string().min(1).nullish(),
})

const updateSegmentSchema = z.object({
  target_text: z.string().optional(),
  status: z.enum(['untranslated', 'draft', 'needs_review', 'approved']).optional(),
  reviewer_id: z.string().min(1).nullish(),
  translator_id: z.string().min(1).nullish(),
})

const listQuerySchema = z.object({
  project_id: z.string().min(1).optional(),
  status: z.enum(['untranslated', 'draft', 'needs_review', 'approved']).optional(),
  target_lang: z.string().min(2).max(10).optional(),
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
    if (q.status) where.push({ field: 'status', operator: '=', value: q.status })
    if (q.target_lang) where.push({ field: 'target_lang', operator: '=', value: q.target_lang })
    const rows = await findMany('translation_segments', {
      where,
      orderBy: [{ field: 'position', direction: 'asc' }],
      limit: q.limit,
      offset: q.offset,
    })
    res.json(rows)
  } catch (error) {
    logger.error('segments.list', error)
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
    const segment = await findById<Record<string, unknown>>('translation_segments', id)
    if (!segment || segment.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('translations.notFound', {}, { defaultValue: 'Segment not found' }) })
      return
    }
    const comments = await findMany('segment_comments', {
      where: [{ field: 'segment_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json({ ...segment, comments })
  } catch (error) {
    logger.error('segments.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  // Enforce the per-tier `maxTranslations` limit the pricing page advertises
  // (free=5, pro=500). A segment IS an owned translation; without this a free
  // user could create unlimited translations, defeating the paywall. Mirrors
  // how projects.ts gates `maxProjects`.
  enforceLimit<AiTranslationHubLimits>({
    limitType: 'maxTranslations',
    getLimit: (limits) => limits.maxTranslations,
    getCurrent: async (userId) =>
      count('translation_segments', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createSegmentSchema),
  async (req, res) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof createSegmentSchema>
      const project = await findById<Record<string, unknown>>(
        'translation_projects',
        body.project_id,
      )
      if (!project || project.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
        return
      }
      const result = await create('translation_segments', {
        user_id: userId,
        project_id: body.project_id,
        file_id: body.file_id ?? null,
        source_text: body.source_text,
        source_lang: body.source_lang,
        target_lang: body.target_lang,
        target_text: '',
        status: 'untranslated',
        position: body.position,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('segments.create', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateSegmentSchema),
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
      const existing = await findById<Record<string, unknown>>('translation_segments', id)
      if (!existing || existing.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('translations.notFound', {}, { defaultValue: 'Segment not found' }) })
        return
      }
      const body = req.body as z.infer<typeof updateSegmentSchema>
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (body.target_text !== undefined) updates.target_text = body.target_text
      if (body.status !== undefined) updates.status = body.status
      if (body.reviewer_id !== undefined) updates.reviewer_id = body.reviewer_id
      if (body.translator_id !== undefined) updates.translator_id = body.translator_id
      const result = await updateById('translation_segments', id, updates)
      res.json(result.data)
    } catch (error) {
      logger.error('segments.update', error)
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
    const existing = await findById<Record<string, unknown>>('translation_segments', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('translations.notFound', {}, { defaultValue: 'Segment not found' }) })
      return
    }
    await deleteById('translation_segments', id)
    res.status(204).end()
  } catch (error) {
    logger.error('segments.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/* ----------------------------- Comments ----------------------------------- */

const createCommentSchema = z.object({ body: z.string().min(1) })

router.get('/:id/comments', validateParams(idParamSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const segment = await findById<Record<string, unknown>>('translation_segments', id)
    if (!segment || segment.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('translations.notFound', {}, { defaultValue: 'Segment not found' }) })
      return
    }
    const comments = await findMany('segment_comments', {
      where: [{ field: 'segment_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(comments)
  } catch (error) {
    logger.error('segments.listComments', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/:id/comments',
  validateParams(idParamSchema),
  validateBody(createCommentSchema),
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
      const segment = await findById<Record<string, unknown>>('translation_segments', id)
      if (!segment || segment.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('translations.notFound', {}, { defaultValue: 'Segment not found' }) })
        return
      }
      const body = req.body as z.infer<typeof createCommentSchema>
      const result = await create('segment_comments', {
        segment_id: id,
        user_id: userId,
        body: body.body,
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('segments.createComment', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
