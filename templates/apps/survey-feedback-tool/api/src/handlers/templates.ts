import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorization } from '@molecule/api-resource-user'

import { asyncHandler } from '../lib/asyncHandler.js'
import { requireTemplateOwnershipOrPublic } from '../lib/authz.js'

const router = Router()

// Public starter templates seeded on first boot. Without these the
// Templates page is empty for every brand-new user, which makes
// the "apply template → start survey" flow undiscoverable. See
// AGENTS.md / dispatch-flagship.md (production-ready bar).
const SEED_TEMPLATES: Array<{
  name: string
  description: string
  kind: string
  questions: Array<{
    type: string
    text: string
    required?: boolean
    options?: string[]
    description?: string
  }>
}> = [
  {
    name: 'Customer Satisfaction (CSAT)',
    description: 'Quick 4-question check-in for any customer interaction.',
    kind: 'csat',
    questions: [
      {
        type: 'csat',
        text: 'How satisfied are you with your recent experience?',
        required: true,
      },
      {
        type: 'long_text',
        text: 'What would have made it better?',
      },
      {
        type: 'single_choice',
        text: 'Which area did you interact with?',
        options: ['Sales', 'Support', 'Billing', 'Product'],
        required: true,
      },
      {
        type: 'email',
        text: 'Email (optional, in case we want to follow up)',
      },
    ],
  },
  {
    name: 'Net Promoter Score (NPS)',
    description: 'Industry-standard NPS survey with one follow-up question.',
    kind: 'nps',
    questions: [
      {
        type: 'nps',
        text: 'How likely are you to recommend us to a friend or colleague?',
        required: true,
      },
      {
        type: 'long_text',
        text: 'What is the primary reason for your score?',
      },
    ],
  },
  {
    name: 'Product Feedback',
    description: 'Gather structured feedback on a product or feature launch.',
    kind: 'product',
    questions: [
      {
        type: 'rating',
        text: 'Overall, how would you rate this product?',
        required: true,
      },
      {
        type: 'multi_choice',
        text: 'Which features do you use most?',
        options: ['Dashboards', 'Reports', 'Integrations', 'Notifications', 'Mobile app'],
      },
      {
        type: 'long_text',
        text: 'What would you change or add?',
      },
      {
        type: 'short_text',
        text: 'What other tools do you use alongside us?',
      },
    ],
  },
]

export async function ensurePublicTemplates(): Promise<void> {
  try {
    const existing = await count('survey_templates', [
      { field: 'is_public', operator: '=', value: true },
    ])
    if (existing > 0) return
    const now = new Date().toISOString()
    for (const tpl of SEED_TEMPLATES) {
      await create('survey_templates', {
        owner_id: null,
        name: tpl.name,
        description: tpl.description,
        kind: tpl.kind,
        questions: JSON.stringify(tpl.questions),
        is_public: true,
        created_at: now,
        updated_at: now,
      })
    }
    logger.info(`Seeded ${SEED_TEMPLATES.length} public survey templates.`)
  } catch (err) {
    logger.error(err)
  }
}

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  kind: z.string().max(40).optional().default('general'),
  questions: z.array(z.unknown()).optional().default([]),
})

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  kind: z.string().max(40).optional(),
  questions: z.array(z.unknown()).optional(),
})

router.use(authorization.verifyMiddleware())

// List templates: returns owner-private + public/system templates.
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const owned = await findMany('survey_templates', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const publicOnes = await findMany('survey_templates', {
      where: [{ field: 'is_public', operator: '=', value: true }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const seen = new Set<string>()
    const merged = [
      ...(owned as Array<Record<string, unknown>>),
      ...(publicOnes as Array<Record<string, unknown>>),
    ].filter((row) => {
      const id = String((row as { id?: unknown }).id ?? '')
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
    res.json(merged)
  }),
)

// Read one template (own or public).
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
    const check = await requireTemplateOwnershipOrPublic(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('template.notFound', {}, { defaultValue: 'Template not found' }),
      })
      return
    }
    res.json(check.row)
  }),
)

// Create — owner-private template (is_public always false on user create).
router.post(
  '/',
  validateBody(createTemplateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const result = await create('survey_templates', {
      owner_id: userId,
      name: req.body.name,
      description: req.body.description,
      kind: req.body.kind,
      questions: JSON.stringify(req.body.questions ?? []),
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  }),
)

// Update — owner-only (cannot mutate public seeds).
router.patch(
  '/:id',
  validateBody(updateTemplateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const check = await requireTemplateOwnershipOrPublic<{
      owner_id?: unknown
      is_public?: unknown
    }>(req.params.id as string, userId)
    if (!check.ok || check.row.is_public) {
      res
        .status(404)
        .json({ error: t('template.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    const patch: Record<string, unknown> = { ...req.body, updated_at: new Date().toISOString() }
    if ('questions' in patch) patch.questions = JSON.stringify(patch.questions ?? [])
    const result = await updateById('survey_templates', req.params.id as string, patch)
    res.json(result.data)
  }),
)

// Apply a template — clones its questions into a new survey owned by caller.
router.post(
  '/:id/apply',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const check = await requireTemplateOwnershipOrPublic<{
      id?: unknown
      name?: unknown
      questions?: unknown
      owner_id?: unknown
      is_public?: unknown
    }>(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('template.notFound', {}, { defaultValue: 'Template not found' }),
      })
      return
    }
    const surveyResult = await create('surveys', {
      owner_id: userId,
      title: String(check.row.name ?? 'New survey'),
      description: '',
      slug: null,
      status: 'draft',
      settings: JSON.stringify({}),
      response_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const survey = surveyResult.data as Record<string, unknown> | null
    if (!survey) {
      throw new Error('Could not create survey from template')
    }

    const questions = Array.isArray(check.row.questions) ? check.row.questions : []
    let position = 0
    for (const q of questions as Array<Record<string, unknown>>) {
      await create('survey_questions', {
        survey_id: survey.id,
        position: position++,
        type: String(q.type ?? 'short_text'),
        text: String(q.text ?? 'Untitled question'),
        description: q.description ?? null,
        options: q.options == null ? null : JSON.stringify(q.options),
        required: Boolean(q.required ?? false),
        conditional_logic: q.conditional_logic == null ? null : JSON.stringify(q.conditional_logic),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
    res.status(201).json(survey)
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
    const check = await requireTemplateOwnershipOrPublic<{
      owner_id?: unknown
      is_public?: unknown
    }>(req.params.id as string, userId)
    if (!check.ok || check.row.is_public) {
      res
        .status(404)
        .json({ error: t('template.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    await deleteById('survey_templates', req.params.id as string)
    res.status(204).end()
  }),
)

export default router
