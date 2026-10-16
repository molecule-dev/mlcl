import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { asyncHandler } from '../lib/asyncHandler.js'
import { findPublishedSurveyBySlug, requireSurveyOwnership } from '../lib/authz.js'
import type { SurveyFeedbackToolLimits } from '../tiers.js'

const router = Router()

const slugRx = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/

const createSurveySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  slug: z.string().regex(slugRx).optional(),
  settings: z.record(z.string(), z.unknown()).optional().default({}),
})

const updateSurveySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  slug: z.string().regex(slugRx).nullable().optional(),
  status: z.enum(['draft', 'published', 'closed', 'archived']).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})

// Public lookup by slug — no auth, but only `published` surveys are visible.
router.get(
  '/by-slug/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const slug = String(req.params.slug)
    const survey = await findPublishedSurveyBySlug<{ id: unknown; status?: unknown }>(slug)
    if (!survey) {
      res
        .status(404)
        .json({ error: t('survey.notFound', {}, { defaultValue: 'Survey not found' }) })
      return
    }
    if (survey.status === 'closed' || survey.status === 'archived') {
      res.status(410).json({ error: t('survey.closed', {}, { defaultValue: 'Survey is closed' }) })
      return
    }
    if (survey.status !== 'published') {
      res
        .status(404)
        .json({ error: t('survey.notFound', {}, { defaultValue: 'Survey not found' }) })
      return
    }
    const questions = await findMany('survey_questions', {
      where: [{ field: 'survey_id', operator: '=', value: String(survey.id) }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json({ ...survey, questions })
  }),
)

// List surveys — owner-scoped.
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { status, page = '1', limit = '50' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })

    const surveys = await findMany('surveys', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(surveys)
  }),
)

// Get survey detail (owner-only).
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const check = await requireSurveyOwnership(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('survey.notFound', {}, { defaultValue: 'Survey not found' }),
      })
      return
    }
    const questions = await findMany('survey_questions', {
      where: [{ field: 'survey_id', operator: '=', value: req.params.id as string }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json({ ...check.row, questions })
  }),
)

// Enforce the per-tier survey cap (tiers.ts maxSurveys) — defined + advertised but never enforced.
const enforceSurveyLimit = enforceLimit<SurveyFeedbackToolLimits>({
  limitType: 'maxSurveys',
  getLimit: (limits) => limits.maxSurveys,
  getCurrent: async (userId) =>
    count('surveys', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

// Create survey.
router.post(
  '/',
  enforceSurveyLimit,
  validateBody(createSurveySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { title, description, slug, settings } = req.body

    if (slug) {
      const dupe = await findOne('surveys', [{ field: 'slug', operator: '=', value: slug }])
      if (dupe) {
        res.status(409).json({
          error: t('survey.slugTaken', {}, { defaultValue: 'Slug is already taken' }),
        })
        return
      }
    }

    const result = await create('surveys', {
      title,
      description,
      slug: slug ?? null,
      status: 'draft',
      settings: JSON.stringify(settings ?? {}),
      response_count: 0,
      owner_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  }),
)

// Update survey.
router.patch(
  '/:id',
  validateBody(updateSurveySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const check = await requireSurveyOwnership(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('survey.notFound', {}, { defaultValue: 'Survey not found' }),
      })
      return
    }
    if (req.body.slug) {
      const dupe = (await findOne('surveys', [
        { field: 'slug', operator: '=', value: req.body.slug },
      ])) as { id?: string } | null
      if (dupe && dupe.id !== req.params.id) {
        res.status(409).json({
          error: t('survey.slugTaken', {}, { defaultValue: 'Slug is already taken' }),
        })
        return
      }
    }
    const patch: Record<string, unknown> = { ...req.body, updated_at: new Date().toISOString() }
    if ('settings' in patch) patch.settings = JSON.stringify(patch.settings ?? {})
    const result = await updateById('surveys', req.params.id as string, patch)
    res.json(result.data)
  }),
)

// Slug helper used by /publish — derives a URL-safe slug from the title and
// suffixes a short random string to avoid collisions. The /s/:slug public
// link is unreachable without a slug, so publish AUTO-GENERATES one if the
// owner didn't pick a custom slug.
function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return base || 'survey'
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 8)
    const candidate = `${base}-${suffix}`
    const dupe = await findOne('surveys', [{ field: 'slug', operator: '=', value: candidate }])
    if (!dupe) return candidate
  }
  return `survey-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Publish — owner-only. Sets status=published, sets published_at, and
// auto-generates a URL slug if absent.
router.post(
  '/:id/publish',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const check = await requireSurveyOwnership<{
      owner_id?: unknown
      slug?: string | null
      title?: string
    }>(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('survey.notFound', {}, { defaultValue: 'Survey not found' }),
      })
      return
    }
    const patch: Record<string, unknown> = {
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (!check.row.slug) {
      patch.slug = await generateUniqueSlug(check.row.title ?? 'survey')
    }
    const result = await updateById('surveys', req.params.id as string, patch)
    res.json(result.data)
  }),
)

// Close — owner-only.
router.post(
  '/:id/close',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const check = await requireSurveyOwnership(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('survey.notFound', {}, { defaultValue: 'Survey not found' }),
      })
      return
    }
    const result = await updateById('surveys', req.params.id as string, {
      status: 'closed',
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  }),
)

// Aggregate stats — owner-only.
router.get(
  '/:id/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const check = await requireSurveyOwnership(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('survey.notFound', {}, { defaultValue: 'Survey not found' }),
      })
      return
    }
    const totalResponses = await count('survey_responses', [
      { field: 'survey_id', operator: '=', value: req.params.id as string },
    ])
    const totalQuestions = await count('survey_questions', [
      { field: 'survey_id', operator: '=', value: req.params.id as string },
    ])
    res.json({
      total_responses: totalResponses,
      total_questions: totalQuestions,
    })
  }),
)

// Delete — owner-only.
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const check = await requireSurveyOwnership(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('survey.notFound', {}, { defaultValue: 'Survey not found' }),
      })
      return
    }
    await deleteById('surveys', req.params.id as string)
    res.status(204).end()
  }),
)

export default router
