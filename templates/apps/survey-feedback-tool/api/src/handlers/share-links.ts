import { randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { asyncHandler } from '../lib/asyncHandler.js'
import { requireSurveyChildOwnership, requireSurveyOwnership } from '../lib/authz.js'

const router = Router()

const createShareLinkSchema = z.object({
  survey_id: z.string().min(1),
  kind: z.enum(['public', 'email', 'embed']).default('public'),
  expires_at: z.string().datetime().optional().nullable(),
  max_responses: z.number().int().min(1).max(1_000_000).optional().nullable(),
})

// List share links for a survey — owner-only.
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
        error: t('shareLink.surveyIdRequired', {}, { defaultValue: 'survey_id is required' }),
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
    const items = await findMany('survey_share_links', {
      where: [{ field: 'survey_id', operator: '=', value: surveyId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(items)
  }),
)

// Create a share link — owner-only.
router.post(
  '/',
  validateBody(createShareLinkSchema),
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

    const urlToken = randomBytes(18).toString('base64url')

    const result = await create('survey_share_links', {
      survey_id: req.body.survey_id,
      kind: req.body.kind,
      url_token: urlToken,
      created_by_user_id: userId,
      expires_at: req.body.expires_at ?? null,
      max_responses: req.body.max_responses ?? null,
      response_count: 0,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  }),
)

// Delete a share link — owner of the parent survey.
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
      'survey_share_links',
      req.params.id as string,
      userId,
    )
    if (!check.ok) {
      res.status(check.status).json({
        error: t('shareLink.notFound', {}, { defaultValue: 'Share link not found' }),
      })
      return
    }
    await deleteById('survey_share_links', req.params.id as string)
    res.status(204).end()
  }),
)

export default router
