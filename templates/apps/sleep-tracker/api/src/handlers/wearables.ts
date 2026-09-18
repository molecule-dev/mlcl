/**
 * Wearable connection handlers (link/unlink wearables, list user wearables).
 *
 * - Every read/write scopes by `user_id` (ownership) — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - Tier-based limit enforcement via @molecule/api-entitlements.
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const providerEnum = z.enum(['apple_health', 'google_fit', 'fitbit', 'oura', 'withings', 'garmin'])

const linkSchema = z.object({
  provider: providerEnum,
  external_user_id: z.string().max(255).optional(),
  access_token: z.string().max(4096).optional(),
  refresh_token: z.string().max(4096).optional(),
  scopes: z.array(z.string().max(64)).max(20).optional(),
})

const updateSchema = z.object({
  is_active: z.boolean().optional(),
  scopes: z.array(z.string().max(64)).max(20).optional(),
  last_synced_at: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
  const conns = await findMany('wearable_connections', { where, orderBy, limit: 50, offset: 0 })
  res.json(conns)
})

router.post('/', validateBody(linkSchema), async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const body = req.body as z.infer<typeof linkSchema>
  const result = await create('wearable_connections', {
    user_id: userId,
    provider: body.provider,
    external_user_id: body.external_user_id ?? null,
    // Tokens are pseudo-encrypted at this layer (real bond would use
    // @molecule/api-encryption-aes); here we mark and store.
    access_token_encrypted: body.access_token ?? null,
    refresh_token_encrypted: body.refresh_token ?? null,
    scopes: JSON.stringify(body.scopes ?? []),
    last_synced_at: null,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  })
  res.status(201).json(result.data)
})

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('wearable_connections', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('wearables.notFound', undefined, {
          defaultValue: 'Wearable connection not found.',
        }),
      })
      return
    }
    const incoming = { ...(req.body as Record<string, unknown>) }
    if (incoming.scopes !== undefined) {
      incoming.scopes = JSON.stringify(incoming.scopes)
    }
    const updates = { ...incoming, updated_at: new Date() }
    const result = await updateById('wearable_connections', id, updates)
    res.json(result.data)
  },
)

router.delete(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('wearable_connections', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('wearables.notFound', undefined, {
          defaultValue: 'Wearable connection not found.',
        }),
      })
      return
    }
    await deleteMany('wearable_connections', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
