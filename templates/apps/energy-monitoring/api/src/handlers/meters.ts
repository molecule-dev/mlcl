/**
 * Meters CRUD + per-meter token management.
 *
 * All queries are scoped by `user_id`. The `POST /:id/tokens` route mints a
 * fresh ingest token for the meter — see `middleware/meter-token-auth.ts`
 * for the bearer-auth scheme used by `/api/readings`.
 *
 * @module
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { generateMeterToken, hashMeterToken } from '../middleware/meter-token-auth.js'
import type { EnergyMonitoringLimits } from '../tiers.js'
import { maybeSeedDemoForUser } from './_seed.js'

const router = Router()

const meterTypeEnum = z.enum(['grid', 'solar', 'battery'])

const createMeterSchema = z.object({
  name: z.string().min(1),
  type: meterTypeEnum,
  location: z.string().optional(),
  unit: z.string().optional(),
  description: z.string().optional(),
})

const updateMeterSchema = z.object({
  name: z.string().min(1).optional(),
  type: meterTypeEnum.optional(),
  location: z.string().nullable().optional(),
  unit: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

const createTokenSchema = z.object({
  label: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    await maybeSeedDemoForUser(userId)
    const meters = await findMany('meters', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(meters)
  } catch (err) {
    logger.error('meters.list', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const meter = await findById<Record<string, unknown>>('meters', id)
    if (!meter || meter.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('meters.notFound', undefined, { defaultValue: 'Meter not found.' }) })
    }
    const latest = await findMany<Record<string, unknown>>('readings', {
      where: [{ field: 'meter_id', operator: '=', value: id }],
      orderBy: [{ field: 'timestamp', direction: 'desc' }],
      limit: 1,
    })
    res.json({ ...meter, latest_reading: latest[0] ?? null })
  } catch (err) {
    logger.error('meters.get', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post(
  '/',
  enforceLimit<EnergyMonitoringLimits>({
    limitType: 'maxMeters',
    getLimit: (limits) => limits.maxMeters,
    getCurrent: async (userId) =>
      count('meters', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createMeterSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId)
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })

      const { name, type, location, unit, description } = req.body
      const result = await create('meters', {
        user_id: userId,
        name,
        type,
        location: location ?? null,
        unit: unit ?? 'kWh',
        description: description ?? '',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (err) {
      logger.error('meters.create', err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

router.put('/:id', validateBody(updateMeterSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('meters', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('meters.notFound', undefined, { defaultValue: 'Meter not found.' }) })
    }

    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    const result = await updateById('meters', id, updates)
    res.json(result.data)
  } catch (err) {
    logger.error('meters.update', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('meters', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('meters.notFound', undefined, { defaultValue: 'Meter not found.' }) })
    }
    const result = await updateById('meters', id, { status: 'inactive', updated_at: new Date() })
    res.json(result.data)
  } catch (err) {
    logger.error('meters.deactivate', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('meters', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('meters.notFound', undefined, { defaultValue: 'Meter not found.' }) })
    }
    const readingsCount = await count('readings', [{ field: 'meter_id', operator: '=', value: id }])
    if (readingsCount > 0) {
      return res.status(409).json({
        error: t('meters.hasReadings', undefined, {
          defaultValue: 'Cannot delete meter with existing readings. Deactivate instead.',
        }),
      })
    }
    await deleteById('meters', id)
    res.status(204).end()
  } catch (err) {
    logger.error('meters.delete', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

/* ----------------------- per-meter ingest tokens ----------------------- */

router.get('/:id/tokens', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const meter = await findById<Record<string, unknown>>('meters', id)
    if (!meter || meter.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('meters.notFound', undefined, { defaultValue: 'Meter not found.' }) })
    }

    const tokens = await findMany<Record<string, unknown>>('meter_tokens', {
      where: [
        { field: 'meter_id', operator: '=', value: id },
        { field: 'user_id', operator: '=', value: userId },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    // Never expose the hash itself.
    res.json(
      tokens.map((row) => {
        const safe = { ...(row as Record<string, unknown>) }
        delete safe['token_hash']
        return safe
      }),
    )
  } catch (err) {
    logger.error('meters.tokens_list', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post('/:id/tokens', validateBody(createTokenSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const meter = await findById<Record<string, unknown>>('meters', id)
    if (!meter || meter.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('meters.notFound', undefined, { defaultValue: 'Meter not found.' }) })
    }

    const token = generateMeterToken()
    const tokenHash = hashMeterToken(token)
    const result = await create('meter_tokens', {
      meter_id: id,
      user_id: userId,
      token_hash: tokenHash,
      label: req.body?.label ?? null,
      enabled: true,
      created_at: new Date(),
    })
    // Return the plaintext token ONCE — it is never recoverable later.
    const data = { ...(result as { data: Record<string, unknown> }).data }
    delete data['token_hash']
    res.status(201).json({ ...data, token })
  } catch (err) {
    logger.error('meters.token_create', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.delete('/:id/tokens/:tokenId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const tokenId = String(req.params.tokenId ?? '')
    const meter = await findById<Record<string, unknown>>('meters', id)
    if (!meter || meter.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('meters.notFound', undefined, { defaultValue: 'Meter not found.' }) })
    }

    const tokenRow = await findById<Record<string, unknown>>('meter_tokens', tokenId)
    if (!tokenRow || tokenRow.meter_id !== id || tokenRow.user_id !== userId) {
      return res.status(404).json({
        error: t('meters.tokenNotFound', undefined, { defaultValue: 'Token not found.' }),
      })
    }
    await updateById('meter_tokens', tokenId, { enabled: false, revoked_at: new Date() })
    res.status(204).end()
  } catch (err) {
    logger.error('meters.token_revoke', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

export default router
