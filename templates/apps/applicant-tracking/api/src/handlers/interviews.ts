import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

const listQuerySchema = z.object({
  candidate_id: z.string().uuid().optional(),
  job_id: z.string().uuid().optional(),
})

const createBodySchema = z.object({
  candidate_id: z.string().uuid(),
  job_id: z.string().uuid().optional(),
  scheduled_at: z.string().datetime(),
  duration_minutes: z.number().int().positive().max(720).optional().default(60),
  panel_user_ids: z.array(z.string().uuid()).optional().default([]),
  stage: z.string().optional(),
  notes: z.string().optional(),
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
    const params: unknown[] = [userId]
    let sql = `
      SELECT
        i.*,
        TRIM(BOTH ' ' FROM COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) AS candidate_name,
        c.email AS candidate_email,
        j.title AS job_title
      FROM interviews i
      LEFT JOIN candidates c ON c.id = i.candidate_id
      LEFT JOIN jobs j ON j.id = i.job_id
      WHERE i.user_id = $1
    `
    if (parsed.data.candidate_id) {
      params.push(parsed.data.candidate_id)
      sql += ` AND i.candidate_id = $${params.length}`
    }
    if (parsed.data.job_id) {
      params.push(parsed.data.job_id)
      sql += ` AND i.job_id = $${params.length}`
    }
    sql += ' ORDER BY i.scheduled_at ASC'
    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err) {
    console.error('GET /interviews failed', err)
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
    const result = await create('interviews', {
      user_id: userId,
      candidate_id: body.candidate_id,
      job_id: body.job_id ?? null,
      scheduled_at: new Date(body.scheduled_at),
      duration_minutes: body.duration_minutes,
      panel_user_ids: body.panel_user_ids,
      stage: body.stage ?? null,
      notes: body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error('POST /interviews failed', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
