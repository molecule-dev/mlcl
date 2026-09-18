import { randomBytes } from 'node:crypto'

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { ItineraryPlannerLimits } from '../tiers.js'

const router = Router()

// Share tokens gate an anonymous reader's access to an otherwise-private trip via
// its shareable link, so they are bearer secrets and must be unguessable.
// Math.random is a non-cryptographic PRNG whose output is predictable/enumerable
// — mint share tokens with a CSPRNG instead. [L2-1]
export const generateShareToken = (): string => randomBytes(16).toString('base64url')

const createTripSchema = z.object({
  name: z.string().min(1),
  destination: z.string().nullish(),
  country: z.string().nullish(),
  cover_url: z.string().nullish(),
  start_date: z.string().nullish(),
  end_date: z.string().nullish(),
  status: z.enum(['planning', 'upcoming', 'active', 'completed', 'archived']).nullish(),
  budget_total_cents: z.number().int().nonnegative().nullish(),
  visibility: z.enum(['private', 'shareable_link']).nullish(),
  timezone: z.string().nullish(),
  notes: z.string().nullish(),
})

const updateTripSchema = createTripSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const trips = await findMany('trips', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'start_date', direction: 'desc' }],
    })
    res.json(trips)
  } catch (error) {
    logger.error('trips.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const trip = await findById<Record<string, unknown>>('trips', id)
    if (!trip) {
      return res
        .status(404)
        .json({ error: t('trip.notFound', undefined, { defaultValue: 'Trip not found.' }) })
    }
    // Owner OR an accepted collaborator may read the trip (collaborators.ts POST /accept
    // adds the row when a recipient redeems their invite). 404 (not 403) so a non-member
    // can't confirm the trip exists.
    if (trip.user_id !== userId) {
      const collab = await findMany('trip_collaborators', {
        where: [
          { field: 'trip_id', operator: '=', value: id },
          { field: 'user_id', operator: '=', value: userId },
        ],
        limit: 1,
      })
      if (collab.length === 0) {
        return res
          .status(404)
          .json({ error: t('trip.notFound', undefined, { defaultValue: 'Trip not found.' }) })
      }
    }
    res.json(trip)
  } catch (error) {
    logger.error('trips.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post(
  '/',
  enforceLimit<ItineraryPlannerLimits>({
    limitType: 'maxTrips',
    getLimit: (limits) => limits.maxTrips,
    getCurrent: async (userId) =>
      count('trips', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createTripSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
      }
      const data = req.body as z.infer<typeof createTripSchema>
      const result = await create('trips', {
        user_id: userId,
        name: data.name,
        destination: data.destination ?? null,
        country: data.country ?? null,
        cover_url: data.cover_url ?? null,
        start_date: data.start_date ?? null,
        end_date: data.end_date ?? null,
        status: data.status ?? 'planning',
        budget_total_cents: data.budget_total_cents ?? 0,
        visibility: data.visibility ?? 'private',
        timezone: data.timezone ?? null,
        notes: data.notes ?? null,
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('trips.ts', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

router.put('/:id', validateBody(updateTripSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('trips', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('trip.notFound', undefined, { defaultValue: 'Trip not found.' }) })
    }
    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    const result = await updateById('trips', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('trips.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('trips', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('trip.notFound', undefined, { defaultValue: 'Trip not found.' }) })
    }
    await deleteById('trips', id)
    res.status(204).end()
  } catch (error) {
    logger.error('trips.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const trip = await findById<Record<string, unknown>>('trips', id)
    if (!trip || trip.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('trip.notFound', undefined, { defaultValue: 'Trip not found.' }) })
    }
    const result = await create('trips', {
      user_id: userId,
      name: `${(trip.name as string) ?? 'Trip'} (copy)`,
      destination: trip.destination ?? null,
      country: trip.country ?? null,
      cover_url: trip.cover_url ?? null,
      status: 'planning',
      budget_total_cents: 0,
      visibility: 'private',
      timezone: trip.timezone ?? null,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('trips.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post('/:id/share', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const trip = await findById<Record<string, unknown>>('trips', id)
    if (!trip || trip.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('trip.notFound', undefined, { defaultValue: 'Trip not found.' }) })
    }
    const token = (trip.share_token as string) || generateShareToken()
    const result = await updateById('trips', id, {
      share_token: token,
      visibility: 'shareable_link',
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('trips.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

export default router
