import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { geocode } from '@molecule/api-geolocation'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { WeatherDashboardLimits } from '../tiers.js'

const router = Router()

const createLocationSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  region: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timezone: z.string().optional(),
  is_default: z.boolean().optional(),
})

const updateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  region: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timezone: z.string().optional(),
  is_default: z.boolean().optional(),
})

const geocodeSchema = z.object({
  address: z.string().min(1),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]

    const locations = await findMany('locations', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
      limit: 100,
    })

    res.json(locations)
  } catch (error) {
    logger.error('locations.getAll', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/default', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const matches = await findMany('locations', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'is_default', operator: '=', value: true },
      ],
      limit: 1,
    })

    if (matches.length === 0) {
      return res.status(404).json({
        error: t('locations.noDefault', {}, { defaultValue: 'No default location set' }),
      })
    }
    res.json(matches[0])
  } catch (error) {
    logger.error('locations.getDefault', error)
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
    const id = getParamId(req)
    const location = await findById<Record<string, unknown>>('locations', id)
    if (!location || location.user_id !== userId) {
      return res.status(404).json({
        error: t('locations.notFound', {}, { defaultValue: 'Location not found' }),
      })
    }
    res.json(location)
  } catch (error) {
    logger.error('locations.getById', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<WeatherDashboardLimits>({
    limitType: 'maxLocations',
    getLimit: (limits) => limits.maxLocations,
    getCurrent: (userId) =>
      count('locations', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createLocationSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const { name, address, region, latitude, longitude, timezone, is_default } = req.body

      let lat = latitude
      let lng = longitude

      if (address && (lat == null || lng == null)) {
        try {
          const results = await geocode(address)
          if (!results || results.length === 0) {
            return res.status(400).json({
              error: t(
                'locations.geocodeFailed',
                {},
                {
                  defaultValue: 'Could not resolve address to coordinates',
                },
              ),
            })
          }
          lat = results[0].lat
          lng = results[0].lng
        } catch (_error) {
          // Geocode service error — caller receives a 400 with the user-facing message
          return res.status(400).json({
            error: t(
              'locations.geocodeFailed',
              {},
              {
                defaultValue: 'Could not resolve address to coordinates',
              },
            ),
          })
        }
      }

      if (lat == null || lng == null) {
        return res.status(400).json({
          error: t(
            'locations.coordsRequired',
            {},
            {
              defaultValue: 'Latitude and longitude are required',
            },
          ),
        })
      }

      if (is_default) {
        const existingDefaults = await findMany<Record<string, unknown>>('locations', {
          where: [
            { field: 'user_id', operator: '=', value: userId },
            { field: 'is_default', operator: '=', value: true },
          ],
        })
        for (const loc of existingDefaults) {
          await updateById('locations', String(loc.id), { is_default: false })
        }
      }

      const result = await create('locations', {
        user_id: userId,
        name: name || address || t('locations.unnamed', {}, { defaultValue: 'Unnamed Location' }),
        region: region ?? null,
        address: address ?? null,
        latitude: lat,
        longitude: lng,
        timezone: timezone ?? null,
        is_default: !!is_default,
      })
      res.status(201).json(result.data ?? result)
    } catch (error) {
      logger.error('locations.create', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updateLocationSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('locations', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('locations.notFound', {}, { defaultValue: 'Location not found' }),
      })
    }

    if (req.body.is_default) {
      const defaults = await findMany<Record<string, unknown>>('locations', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'is_default', operator: '=', value: true },
        ],
      })
      for (const loc of defaults) {
        if (String(loc.id) !== id) {
          await updateById('locations', String(loc.id), { is_default: false })
        }
      }
    }

    const result = await updateById('locations', id, {
      ...req.body,
      updated_at: new Date(),
    })
    res.json(result.data ?? result)
  } catch (error) {
    logger.error('locations.update', error)
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
    const existing = await findById<Record<string, unknown>>('locations', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('locations.notFound', {}, { defaultValue: 'Location not found' }),
      })
    }
    await deleteById('locations', id)

    if (existing.is_default) {
      const remaining = await findMany<Record<string, unknown>>('locations', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'created_at', direction: 'asc' }],
        limit: 1,
      })
      if (remaining.length > 0) {
        await updateById('locations', String(remaining[0].id), { is_default: true })
      }
    }

    res.status(204).end()
  } catch (error) {
    logger.error('locations.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/geocode', validateBody(geocodeSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { address } = req.body
    try {
      const results = await geocode(address)
      res.json(results || [])
    } catch (_error) {
      // Geocode service error — caller receives a 502 with the user-facing message
      res.status(502).json({
        error: t(
          'locations.geocodeFailed',
          {},
          {
            defaultValue: 'Could not resolve address to coordinates',
          },
        ),
      })
    }
  } catch (error) {
    logger.error('locations.geocode', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
