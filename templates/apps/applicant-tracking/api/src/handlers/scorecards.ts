import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

const listQuerySchema = z.object({
  application_id: z.string().uuid().optional(),
  candidate_id: z.string().uuid().optional(),
  interview_id: z.string().uuid().optional(),
})

const createBodySchema = z.object({
  application_id: z.string().uuid().optional(),
  candidate_id: z.string().uuid().optional(),
  interview_id: z.string().uuid().optional(),
  overall_rating: z.number().min(0).max(5),
  skills_rating: z.number().min(0).max(5).optional(),
  culture_rating: z.number().min(0).max(5).optional(),
  notes: z.string().optional(),
  recommendation: z
    .enum(['strong_yes', 'yes', 'no_decision', 'no', 'strong_no'])
    .optional()
    .default('no_decision'),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const parsed = listQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
        errors: parsed.error.issues,
      })
    }
    const { application_id, candidate_id, interview_id } = parsed.data
    const where = [{ field: 'user_id', operator: '=' as const, value: userId }]
    if (application_id)
      where.push({ field: 'application_id', operator: '=' as const, value: application_id })
    if (candidate_id)
      where.push({ field: 'candidate_id', operator: '=' as const, value: candidate_id })
    if (interview_id)
      where.push({ field: 'interview_id', operator: '=' as const, value: interview_id })
    const items = await findMany('scorecards', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (err) {
    console.error('GET /scorecards failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const parsed = createBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
        errors: parsed.error.issues,
      })
    }
    const body = parsed.data
    const result = await create('scorecards', {
      user_id: userId,
      application_id: body.application_id ?? null,
      candidate_id: body.candidate_id ?? null,
      interview_id: body.interview_id ?? null,
      reviewer_id: userId,
      overall_rating: body.overall_rating,
      skills_rating: body.skills_rating ?? null,
      culture_rating: body.culture_rating ?? null,
      notes: body.notes ?? null,
      recommendation: body.recommendation,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error('POST /scorecards failed', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
