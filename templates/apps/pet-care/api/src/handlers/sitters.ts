import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

// Self-service onboarding/edit schema. Trust + reputation columns are
// deliberately omitted so they can NEVER be mass-assigned from the request
// body: `is_verified` is an operator-only trust flag (a sitter must not be
// able to verify themselves), and `avg_rating` / `total_bookings` are
// server-derived reputation. Keep all three out of this schema; set/derive
// them server-side only.
const upsertSitterSchema = z.object({
  display_name: z.string().min(1),
  bio: z.string().optional(),
  services: z.array(z.string()).optional(),
  hourly_rate_cents: z.number().int().nonnegative().optional(),
  location_city: z.string().optional(),
  location_lat: z.number().optional(),
  location_lon: z.number().optional(),
  is_active: z.boolean().optional(),
})

const updateSitterSchema = upsertSitterSchema.partial()

/**
 * Public read: anyone authenticated can browse the sitter directory.
 * Filters honour `service`, `location_city`, `min_rating` query params.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const where: WhereCondition[] = [{ field: 'is_active', operator: '=', value: true }]
    if (req.query.location_city) {
      where.push({ field: 'location_city', operator: '=', value: String(req.query.location_city) })
    }
    if (req.query.verified === 'true') {
      where.push({ field: 'is_verified', operator: '=', value: true })
    }
    if (req.query.min_rating) {
      where.push({ field: 'avg_rating', operator: '>=', value: Number(req.query.min_rating) })
    }

    const sitters = await findMany<Record<string, unknown>>('sitters', {
      where,
      orderBy: [{ field: 'avg_rating', direction: 'desc' }],
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
    })

    // Optional in-memory filter on services jsonb (DataStore lacks JSONB
    // operator support across all backends — keep predicate simple here).
    const filtered = req.query.service
      ? sitters.filter(
          (s) =>
            Array.isArray(s.services) &&
            (s.services as string[]).includes(String(req.query.service)),
        )
      : sitters

    res.json(filtered)
  } catch (err) {
    console.error(`[sitters.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const sitter = await findById<Record<string, unknown>>('sitters', getParamId(req))
    if (!sitter || sitter.is_active === false) {
      return res
        .status(404)
        .json({ error: t('sitters.notFound', {}, { defaultValue: 'Sitter not found' }) })
    }
    res.json(sitter)
  } catch (err) {
    console.error(`[sitters.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Recent reviews for a sitter, hydrated with the reviewer's display name.
 * Anyone authenticated can read; ordered newest first.
 */
router.get('/:id/reviews', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const reviews = await findMany<Record<string, unknown>>('sitter_reviews', {
      where: [{ field: 'sitter_id', operator: '=', value: getParamId(req) }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: Number(req.query.limit) || 10,
    })
    if (reviews.length === 0) return res.json([])

    const reviewerIds = Array.from(
      new Set(reviews.map((r) => String(r.reviewer_user_id)).filter(Boolean)),
    )
    const reviewers = reviewerIds.length
      ? await findMany<Record<string, unknown>>('users', {
          where: [{ field: 'id', operator: 'in', value: reviewerIds }],
          select: ['id', 'name'],
        })
      : []
    const nameById = new Map(reviewers.map((u) => [String(u.id), String(u.name ?? '')]))
    res.json(
      reviews.map((r) => ({
        ...r,
        reviewer_name: nameById.get(String(r.reviewer_user_id)) || null,
      })),
    )
  } catch (err) {
    console.error(`[sitters.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Sitter onboarding — the authenticated user becomes the sitter.
 * One sitter row per user (unique on user_id at the application layer:
 * subsequent POSTs by the same user return the existing row).
 */
router.post('/', validateBody(upsertSitterSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const existing = await findMany<Record<string, unknown>>('sitters', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1,
    })
    if (existing.length > 0) {
      return res.status(409).json({
        error: t(
          'sitters.alreadyOnboarded',
          {},
          { defaultValue: 'You already have a sitter profile' },
        ),
        sitter: existing[0],
      })
    }

    const result = await create('sitters', {
      user_id: userId,
      display_name: req.body.display_name,
      bio: req.body.bio ?? '',
      // jsonb columns must be JSON.stringified — pg adapter would otherwise
      // serialise JS arrays as Postgres ARRAY literals (e.g. {"walking"})
      // which fail JSONB parsing.
      services: JSON.stringify(req.body.services ?? []),
      hourly_rate_cents: req.body.hourly_rate_cents ?? 0,
      location_city: req.body.location_city ?? null,
      location_lat: req.body.location_lat ?? null,
      location_lon: req.body.location_lon ?? null,
      // Trust flag is operator-only — always created unverified, never from
      // the request body. Verification is granted out-of-band by an operator.
      is_verified: false,
      is_active: req.body.is_active ?? true,
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error(`[sitters.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateSitterSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('sitters', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('sitters.notFound', {}, { defaultValue: 'Sitter not found' }) })
    }

    // Build the update from an explicit allow-list of user-editable fields —
    // never spread req.body. This prevents mass-assignment of operator-only /
    // server-derived columns (is_verified, avg_rating, total_bookings) even if
    // a future schema change re-introduces one. Only fields the client
    // actually sent are written, so PATCH-style partial updates still work.
    const editable = [
      'display_name',
      'bio',
      'hourly_rate_cents',
      'location_city',
      'location_lat',
      'location_lon',
      'is_active',
    ] as const
    const updateData: Record<string, unknown> = { updated_at: new Date() }
    for (const field of editable) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field]
    }
    if (req.body.services !== undefined) {
      updateData.services = JSON.stringify(req.body.services)
    }
    const result = await updateById('sitters', id, updateData)
    res.json(result.data)
  } catch (err) {
    console.error(`[sitters.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('sitters', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('sitters.notFound', {}, { defaultValue: 'Sitter not found' }) })
    }

    await deleteById('sitters', id)
    res.status(204).end()
  } catch (err) {
    console.error(`[sitters.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
