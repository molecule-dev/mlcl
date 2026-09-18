/**
 * Translation projects handler — owns the translation_projects CRUD lifecycle.
 *
 * Persistence goes through the abstract `DataStore` from `@molecule/api-database`.
 * Vendor SDKs never appear here. Ownership is enforced on every read/write —
 * non-owner reads return 404, not 403, to avoid leaking existence (per
 * INVENTORY's authorization rules).
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
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
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import type { AiTranslationHubLimits } from '../tiers.js'

const router = Router()

const langCode = z.string().min(2).max(10)
const targetLangsList = z.array(langCode).min(1)

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  source_lang: langCode.default('EN'),
  target_langs: targetLangsList,
  status: z.enum(['draft', 'in_progress', 'review', 'completed']).default('draft'),
  due_date: z.string().datetime().nullish(),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  source_lang: langCode.optional(),
  target_langs: targetLangsList.optional(),
  status: z.enum(['draft', 'in_progress', 'review', 'completed']).optional(),
  due_date: z.string().datetime().nullish(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const rows = await findMany('translation_projects', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(rows)
  } catch (error) {
    logger.error('projects.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const project = await findById<Record<string, unknown>>('translation_projects', id)
    if (!project || project.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    const segments = await findMany('translation_segments', {
      where: [{ field: 'project_id', operator: '=', value: id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    const stats = {
      total: segments.length,
      approved: segments.filter((s) => (s as Record<string, unknown>).status === 'approved').length,
      needs_review: segments.filter((s) => (s as Record<string, unknown>).status === 'needs_review')
        .length,
      draft: segments.filter((s) => (s as Record<string, unknown>).status === 'draft').length,
      untranslated: segments.filter((s) => (s as Record<string, unknown>).status === 'untranslated')
        .length,
    }
    res.json({ ...project, segments, stats })
  } catch (error) {
    logger.error('projects.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<AiTranslationHubLimits>({
    limitType: 'maxProjects',
    getLimit: (limits) => limits.maxProjects,
    getCurrent: async (userId) =>
      count('translation_projects', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createProjectSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof createProjectSchema>
      const result = await create('translation_projects', {
        user_id: userId,
        name: body.name,
        description: body.description,
        source_lang: body.source_lang,
        target_langs: JSON.stringify(body.target_langs),
        status: body.status,
        due_date: body.due_date ? new Date(body.due_date) : null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('projects.create', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateProjectSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const id = getParamId(req)
      const existing = await findById<Record<string, unknown>>('translation_projects', id)
      if (!existing || existing.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
        return
      }
      const body = req.body as z.infer<typeof updateProjectSchema>
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (body.name !== undefined) updates.name = body.name
      if (body.description !== undefined) updates.description = body.description
      if (body.source_lang !== undefined) updates.source_lang = body.source_lang
      if (body.target_langs !== undefined) updates.target_langs = JSON.stringify(body.target_langs)
      if (body.status !== undefined) updates.status = body.status
      if (body.due_date !== undefined) {
        updates.due_date = body.due_date ? new Date(body.due_date) : null
      }
      const result = await updateById('translation_projects', id, updates)
      res.json(result.data)
    } catch (error) {
      logger.error('projects.update', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('translation_projects', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    await deleteById('translation_projects', id)
    res.status(204).end()
  } catch (error) {
    logger.error('projects.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Project export — produces a CSV row per segment for the requested project.
 *
 * Avoided dependency on `@molecule/api-import-export`'s exportData (which
 * doesn't exist as a named export); CSV serialisation is small enough
 * to inline with proper RFC-4180 escaping.
 */
router.get('/:id/export', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const project = await findById<Record<string, unknown>>('translation_projects', id)
    if (!project || project.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    const segments = await findMany<Record<string, unknown>>('translation_segments', {
      where: [{ field: 'project_id', operator: '=', value: id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    const cols = [
      'id',
      'source_lang',
      'target_lang',
      'source_text',
      'target_text',
      'status',
      'position',
    ] as const
    const escape = (v: unknown): string => {
      let s = v == null ? '' : String(v)
      // [L2-1] Neutralize CSV/formula injection (CWE-1236): a cell starting with = + - @ or a
      // leading tab/CR is executed as a formula by Excel/Sheets/LibreOffice. Prefix a single
      // quote (the standard text marker, stripped on display) BEFORE RFC-4180 quoting; genuine
      // numbers are exempt so negative values aren't mangled (mirrors the shared csv escapeField).
      if (!/^-?\d+(\.\d+)?$/.test(s) && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [cols.join(',')]
    for (const row of segments) {
      lines.push(cols.map((c) => escape(row[c])).join(','))
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${String(project.name ?? 'project')}-segments.csv"`,
    )
    res.send(lines.join('\n') + '\n')
  } catch (error) {
    logger.error('projects.export', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
