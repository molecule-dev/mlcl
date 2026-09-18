import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listSubjectsSchema = z.object({
  parent: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

router.get('/', validateQuery(listSubjectsSchema), async (req: Request, res: Response) => {
  try {
    const { parent, limit = 200 } = req.query as unknown as z.infer<typeof listSubjectsSchema>
    const where = parent
      ? [{ field: 'parent_slug', operator: '=' as const, value: String(parent) }]
      : []
    const subjects = await findMany('subjects', {
      where,
      orderBy: [
        { field: 'sort_order', direction: 'asc' },
        { field: 'name', direction: 'asc' },
      ],
      limit: Number(limit),
    })
    res.json(subjects)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:slug/tutors', async (req: Request, res: Response) => {
  try {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug
    const tutors = await findMany('tutor_profiles', {
      where: [
        { field: 'subject', operator: '=', value: slug },
        { field: 'status', operator: '=', value: 'active' },
      ],
      orderBy: [{ field: 'rating_average', direction: 'desc' }],
      limit: 100,
    })
    res.json(tutors)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
