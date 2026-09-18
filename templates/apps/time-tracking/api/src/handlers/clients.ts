import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { TimeTrackingLimits } from '../tiers.js'

const router = Router()

const billingAddressSchema = z
  .object({
    street: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    postal: z.string().optional(),
    country: z.string().optional(),
  })
  .optional()

const createClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  billing_currency: z.string().optional(),
  billing_address: billingAddressSchema,
  hourly_rate_cents: z.number().int().nonnegative().optional().nullable(),
})

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  billing_currency: z.string().optional(),
  billing_address: billingAddressSchema,
  hourly_rate_cents: z.number().int().nonnegative().optional().nullable(),
  archived: z.boolean().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'name', direction: 'asc' }]
    const items = await findMany('clients', { where, orderBy })
    res.json(items)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
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
    const client = await findById<Record<string, unknown>>('clients', id)
    if (!client || client.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('client.notFound', {}, { defaultValue: 'Client not found' }) })
    }
    res.json(client)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Enforce the per-tier client cap (tiers.ts maxClients) — defined + shown on Pricing but enforceLimit
// was never called, so any tier could create unlimited clients.
const enforceClientLimit = enforceLimit<TimeTrackingLimits>({
  limitType: 'maxClients',
  getLimit: (limits) => limits.maxClients,
  getCurrent: async (userId) =>
    count('clients', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceClientLimit,
  validateBody(createClientSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }

      const { name, email, billing_currency, billing_address, hourly_rate_cents } = req.body

      const result = await create('clients', {
        owner_id: userId,
        name,
        email: email ?? null,
        billing_currency: billing_currency ?? 'USD',
        billing_address: billing_address ?? null,
        hourly_rate_cents: hourly_rate_cents ?? null,
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json((result as { data?: unknown }).data ?? result)
    } catch (err: unknown) {
      console.error('[time-tracking handler] internal error:', err)
      res.status(500).json({
        error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put('/:id', validateBody(updateClientSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('clients', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('client.notFound', {}, { defaultValue: 'Client not found' }) })
    }

    const updates: Record<string, unknown> = { updated_at: new Date() }
    for (const field of [
      'name',
      'email',
      'billing_currency',
      'billing_address',
      'hourly_rate_cents',
      'archived',
    ]) {
      if (field in req.body) updates[field] = req.body[field]
    }

    const result = await updateById('clients', id, updates)
    res.json((result as { data?: unknown }).data ?? result)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
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
    const existing = await findById<Record<string, unknown>>('clients', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('client.notFound', {}, { defaultValue: 'Client not found' }) })
    }
    await deleteById('clients', id)
    res.status(204).end()
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
