import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { asyncHandler } from '../lib/asyncHandler.js'
import { requireSurveyChildOwnership, requireSurveyOwnership } from '../lib/authz.js'

const router = Router()

const QUESTION_TYPES = [
  'short_text',
  'long_text',
  'single_choice',
  'multi_choice',
  'rating',
  'nps',
  'csat',
  'email',
  'number',
  'date',
  'file_upload',
  'section',
  'welcome',
] as const

const createQuestionSchema = z.object({
  survey_id: z.string().min(1),
  type: z.enum(QUESTION_TYPES).default('short_text'),
  text: z.string().min(1).max(500),
  description: z.string().max(2000).optional().nullable(),
  options: z.unknown().optional().nullable(),
  required: z.boolean().optional().default(false),
  position: z.number().int().min(0).max(10000).optional().default(0),
  conditional_logic: z.unknown().optional().nullable(),
})

const updateQuestionSchema = z.object({
  type: z.enum(QUESTION_TYPES).optional(),
  text: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  options: z.unknown().optional().nullable(),
  required: z.boolean().optional(),
  position: z.number().int().min(0).max(10000).optional(),
  conditional_logic: z.unknown().optional().nullable(),
})

// List questions — caller must own the parent survey.
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
    const surveyId = req.query.survey_id ? String(req.query.survey_id) : null
    if (!surveyId) {
      res.status(400).json({
        error: t('question.surveyIdRequired', {}, { defaultValue: 'survey_id is required' }),
      })
      return
    }
    const check = await requireSurveyOwnership(surveyId, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('survey.notFound', {}, { defaultValue: 'Survey not found' }),
      })
      return
    }
    const items = await findMany('survey_questions', {
      where: [{ field: 'survey_id', operator: '=', value: surveyId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(items)
  }),
)

// Create.
router.post(
  '/',
  validateBody(createQuestionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const check = await requireSurveyOwnership(String(req.body.survey_id), userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('survey.notFound', {}, { defaultValue: 'Survey not found' }),
      })
      return
    }

    // Auto-position the new question at the end of the survey if the caller
    // didn't pick one. Without this every "add question" click without an
    // explicit position would dump the new row at index 0 — silently
    // re-ordering the survey.
    let position = req.body.position
    if (position == null || position === 0) {
      const existing = (await findMany('survey_questions', {
        where: [{ field: 'survey_id', operator: '=', value: req.body.survey_id }],
        orderBy: [{ field: 'position', direction: 'desc' }],
        limit: 1,
      })) as Array<{ position?: number }>
      position = existing.length > 0 ? Number(existing[0].position ?? 0) + 1 : 0
    }

    const result = await create('survey_questions', {
      survey_id: req.body.survey_id,
      type: req.body.type,
      text: req.body.text,
      description: req.body.description ?? null,
      options: req.body.options == null ? null : JSON.stringify(req.body.options),
      required: req.body.required,
      position,
      conditional_logic:
        req.body.conditional_logic == null ? null : JSON.stringify(req.body.conditional_logic),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  }),
)

// Update.
router.patch(
  '/:id',
  validateBody(updateQuestionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const check = await requireSurveyChildOwnership(
      'survey_questions',
      req.params.id as string,
      userId,
    )
    if (!check.ok) {
      res.status(check.status).json({
        error: t('question.notFound', {}, { defaultValue: 'Question not found' }),
      })
      return
    }
    const patch: Record<string, unknown> = { ...req.body, updated_at: new Date().toISOString() }
    if ('options' in patch) {
      patch.options = patch.options == null ? null : JSON.stringify(patch.options)
    }
    if ('conditional_logic' in patch) {
      patch.conditional_logic =
        patch.conditional_logic == null ? null : JSON.stringify(patch.conditional_logic)
    }
    const result = await updateById('survey_questions', req.params.id as string, patch)
    res.json(result.data)
  }),
)

// Delete.
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
    const check = await requireSurveyChildOwnership(
      'survey_questions',
      req.params.id as string,
      userId,
    )
    if (!check.ok) {
      res.status(check.status).json({
        error: t('question.notFound', {}, { defaultValue: 'Question not found' }),
      })
      return
    }
    await deleteById('survey_questions', req.params.id as string)
    res.status(204).end()
  }),
)

export default router
