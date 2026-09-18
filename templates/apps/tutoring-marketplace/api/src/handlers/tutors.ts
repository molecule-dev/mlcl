import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { index as searchIndex, search as searchSearch } from '@molecule/api-search'

const router = Router()

const listTutorsSchema = z.object({
  search: z.string().optional(),
  subject: z.string().optional(),
  min_rate: z.coerce.number().int().nonnegative().optional(),
  max_rate: z.coerce.number().int().nonnegative().optional(),
  language: z.string().optional(),
  min_rating: z.coerce.number().min(0).max(5).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

const createTutorSchema = z.object({
  display_name: z.string().min(1),
  headline: z.string().optional(),
  bio: z.string().optional(),
  hourly_rate: z.number().int().nonnegative(),
  subject: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  avatar_url: z.string().url().optional(),
})

// Self-service profile edits. `status` is DELIBERATELY excluded: it is a
// moderation field (pending -> active approval, active <-> suspended), not a
// tutor-settable property. Letting a tutor PUT their own `status` would let
// them self-approve or un-suspend their listing (broken access control).
// Status transitions live on the admin-gated PATCH /:id/status route below.
// `payout_account_id` IS self-settable — it is the tutor's own payout account.
const updateTutorSchema = z.object({
  display_name: z.string().min(1).optional(),
  headline: z.string().optional(),
  bio: z.string().optional(),
  hourly_rate: z.number().int().nonnegative().optional(),
  subject: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  avatar_url: z.string().url().optional(),
  payout_account_id: z.string().optional(),
})

// Moderation-only: changing a tutor profile's lifecycle status (approve /
// suspend / reset to pending) is an operator action, gated to an 'admin' role
// on the users table (mirrors the crowdfunding/blog role-gated precedent).
const tutorStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'suspended']),
})

async function isAdmin(userId: string): Promise<boolean> {
  const user = await findById<Record<string, unknown>>('users', userId)
  return user?.role === 'admin'
}

const availabilitySchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  recurring: z.boolean().optional(),
})

router.get('/', validateQuery(listTutorsSchema), async (req: Request, res: Response) => {
  try {
    const {
      search,
      subject,
      min_rate,
      max_rate,
      language,
      min_rating,
      limit = 20,
    } = req.query as unknown as z.infer<typeof listTutorsSchema>

    if (search) {
      try {
        const results = await searchSearch('tutor_profiles', {
          text: String(search),
          perPage: Number(limit),
        })
        res.json(results)
        return
      } catch (searchErr) {
        logger.warn?.(`tutors search failed: ${(searchErr as Error).message}`)
      }
    }

    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'active' }]
    if (subject) where.push({ field: 'subject', operator: '=', value: String(subject) })
    if (typeof min_rate === 'number')
      where.push({ field: 'hourly_rate', operator: '>=', value: min_rate })
    if (typeof max_rate === 'number')
      where.push({ field: 'hourly_rate', operator: '<=', value: max_rate })
    if (typeof min_rating === 'number')
      where.push({ field: 'rating_average', operator: '>=', value: min_rating })

    const orderBy: OrderBy[] = [{ field: 'rating_average', direction: 'desc' }]
    let tutors = await findMany('tutor_profiles', { where, orderBy, limit: Number(limit) })

    if (language) {
      const lang = String(language).toLowerCase()
      tutors = (tutors as Record<string, unknown>[]).filter((tt) => {
        const langs = tt.languages
        if (!Array.isArray(langs)) return false
        return langs.map((l) => String(l).toLowerCase()).includes(lang)
      })
    }
    res.json(tutors)
  } catch (err) {
    logger.error?.(`GET /tutors failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const tutor = await findOne<Record<string, unknown>>('tutor_profiles', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (!tutor) {
      res.status(404).json({
        error: t('tutors.notFound', undefined, { defaultValue: 'Tutor profile not found' }),
      })
      return
    }
    res.json(tutor)
  } catch (err) {
    logger.error?.(`GET /tutors/me failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const tutor = await findById<Record<string, unknown>>('tutor_profiles', id)
    if (!tutor) {
      res
        .status(404)
        .json({ error: t('tutors.notFound', undefined, { defaultValue: 'Tutor not found' }) })
      return
    }
    const rawReviews = (await findMany('reviews', {
      where: [{ field: 'tutor_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 25,
    })) as Array<Record<string, unknown>>
    const reviews = await Promise.all(
      rawReviews.map(async (rv) => {
        const reviewerId = rv.reviewer_id as string | undefined
        let reviewerName = 'Student'
        if (reviewerId) {
          try {
            const reviewer = await findById<{ name?: string }>('users', reviewerId)
            if (reviewer?.name) reviewerName = reviewer.name
          } catch (lookupErr) {
            logger.warn?.(`reviewer lookup failed: ${(lookupErr as Error).message}`)
          }
        }
        return { ...rv, reviewer_name: reviewerName }
      }),
    )
    res.json({ ...tutor, reviews })
  } catch (err) {
    logger.error?.(`GET /tutors/:id failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createTutorSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createTutorSchema>
    const existing = await findOne<Record<string, unknown>>('tutor_profiles', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (existing) {
      res.status(409).json({
        error: t('tutors.alreadyExists', undefined, {
          defaultValue: 'Tutor profile already exists for this user.',
        }),
      })
      return
    }
    const result = await create<Record<string, unknown>>('tutor_profiles', {
      user_id: userId,
      display_name: body.display_name,
      headline: body.headline ?? null,
      bio: body.bio ?? null,
      hourly_rate: body.hourly_rate,
      subject: body.subject ?? null,
      subjects: JSON.stringify(body.subjects ?? []),
      languages: JSON.stringify(body.languages ?? []),
      avatar_url: body.avatar_url ?? null,
      status: 'pending',
      verified: false,
      rating_average: 0,
      rating_count: 0,
      session_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const profile = result.data as Record<string, unknown> | undefined
    if (profile?.id) {
      try {
        await searchIndex('tutor_profiles', String(profile.id), profile)
      } catch (indexErr) {
        logger.warn?.(`tutor_profiles index failed: ${(indexErr as Error).message}`)
      }
    }
    res.status(201).json(profile)
  } catch (err) {
    logger.error?.(`POST /tutors failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateTutorSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('tutor_profiles', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('tutors.notFound', undefined, { defaultValue: 'Tutor not found' }) })
      return
    }
    const body = req.body as Record<string, unknown>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    const JSONB_FIELDS = new Set(['subjects', 'languages'])
    for (const k of [
      'display_name',
      'headline',
      'bio',
      'hourly_rate',
      'subject',
      'subjects',
      'languages',
      'avatar_url',
      'payout_account_id',
    ]) {
      if (k in body) updates[k] = JSONB_FIELDS.has(k) ? JSON.stringify(body[k] ?? []) : body[k]
    }
    const result = await updateById<Record<string, unknown>>('tutor_profiles', id, updates)
    const updated = result.data as Record<string, unknown> | undefined
    if (updated) {
      try {
        await searchIndex('tutor_profiles', String(updated.id ?? id), updated)
      } catch (indexErr) {
        logger.warn?.(`tutor_profiles index failed: ${(indexErr as Error).message}`)
      }
    }
    res.json(updated)
  } catch (err) {
    logger.error?.(`PUT /tutors/:id failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch(
  '/:id/status',
  validateBody(tutorStatusSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      if (!(await isAdmin(userId))) {
        res.status(403).json({
          error: t('tutors.statusForbidden', undefined, {
            defaultValue: 'Only an administrator can change a tutor’s status.',
          }),
        })
        return
      }
      const id = getParamId(req)
      const existing = await findById<Record<string, unknown>>('tutor_profiles', id)
      if (!existing) {
        res
          .status(404)
          .json({ error: t('tutors.notFound', undefined, { defaultValue: 'Tutor not found' }) })
        return
      }
      const { status } = req.body as z.infer<typeof tutorStatusSchema>
      const result = await updateById<Record<string, unknown>>('tutor_profiles', id, {
        status,
        updated_at: new Date(),
      })
      const updated = result.data as Record<string, unknown> | undefined
      if (updated) {
        try {
          await searchIndex('tutor_profiles', String(updated.id ?? id), updated)
        } catch (indexErr) {
          logger.warn?.(`tutor_profiles index failed: ${(indexErr as Error).message}`)
        }
      }
      res.json(updated)
    } catch (err) {
      logger.error?.(`PATCH /tutors/:id/status failed: ${(err as Error).message}`)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.get('/:id/availability', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const slots = await findMany('availability_slots', {
      where: [{ field: 'tutor_id', operator: '=', value: id }],
      orderBy: [{ field: 'day_of_week', direction: 'asc' }],
    })
    res.json(slots)
  } catch (err) {
    logger.error?.(`GET /tutors/:id/availability failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/:id/availability',
  validateBody(availabilitySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const id = getParamId(req)
      const tutor = await findById<Record<string, unknown>>('tutor_profiles', id)
      if (!tutor || tutor.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('tutors.notFound', undefined, { defaultValue: 'Tutor not found' }) })
        return
      }
      const body = req.body as z.infer<typeof availabilitySchema>
      const result = await create('availability_slots', {
        tutor_id: id,
        user_id: userId,
        day_of_week: body.day_of_week,
        start_time: body.start_time,
        end_time: body.end_time,
        recurring: body.recurring ?? true,
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (err) {
      logger.error?.(`POST /tutors/:id/availability failed: ${(err as Error).message}`)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:id/availability/:slotId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const tutorId = getParamId(req)
    const slotId = Array.isArray(req.params.slotId) ? req.params.slotId[0] : req.params.slotId
    const tutor = await findById<Record<string, unknown>>('tutor_profiles', tutorId)
    if (!tutor || tutor.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('tutors.notFound', undefined, { defaultValue: 'Tutor not found' }) })
      return
    }
    const slot = await findById<Record<string, unknown>>('availability_slots', slotId)
    if (!slot || slot.user_id !== userId) {
      res.status(404).json({
        error: t('availability.notFound', undefined, {
          defaultValue: 'Availability slot not found',
        }),
      })
      return
    }
    const { deleteById } = await import('@molecule/api-database')
    await deleteById('availability_slots', slotId)
    res.status(204).end()
  } catch (err) {
    logger.error?.(`DELETE /tutors/:id/availability/:slotId failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
