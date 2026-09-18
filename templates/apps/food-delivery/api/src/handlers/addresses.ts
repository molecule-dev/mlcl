/**
 * Per-user delivery addresses.
 *   GET    /api/addresses          → list (default first)
 *   POST   /api/addresses          → create
 *   PUT    /api/addresses/:id      → update
 *   POST   /api/addresses/:id/default → mark as default
 *   DELETE /api/addresses/:id      → delete
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { geocode } from '@molecule/api-geolocation'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createSchema = z.object({
  label: z.string().min(1).optional(),
  street: z.string().min(1),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  is_default: z.boolean().optional(),
})

const updateSchema = createSchema.partial()

async function attachLatLng(payload: Record<string, unknown>): Promise<void> {
  const street = payload.street as string | undefined
  const city = payload.city as string | undefined
  const fullAddress = [street, city].filter(Boolean).join(', ')
  if (!fullAddress) return
  try {
    const results = await geocode(fullAddress)
    if (results && results.length > 0) {
      payload.lat = Number(results[0].lat)
      payload.lng = Number(results[0].lng)
    }
  } catch (err) {
    logger.warn?.(`addresses geocode failed: ${(err as Error).message}`)
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const rows = await findMany<Record<string, unknown>>('addresses', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [
      { field: 'is_default', direction: 'desc' },
      { field: 'created_at', direction: 'asc' },
    ],
    limit: 50,
  })
  res.json({ data: rows })
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const body = req.body as Record<string, unknown>
  const isDefault = body.is_default === true

  // If this address is being saved as default, unset previous defaults first.
  if (isDefault) {
    const existing = await findMany<Record<string, unknown>>('addresses', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'is_default', operator: '=', value: true },
      ],
      limit: 50,
    })
    for (const row of existing) {
      await updateById('addresses', String(row.id), { is_default: false })
    }
  }

  const row: Record<string, unknown> = {
    user_id: userId,
    label: (body.label as string) ?? null,
    street: body.street,
    city: (body.city as string) ?? null,
    postal_code: (body.postal_code as string) ?? null,
    country: (body.country as string) ?? null,
    is_default: isDefault,
  }
  await attachLatLng(row)
  const result = await create('addresses', row)
  res.status(201).json(result.data ?? result)
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const rawId = req.params.id
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  const existing = await findById<Record<string, unknown>>('addresses', id)
  if (!existing || existing.user_id !== userId) {
    res.status(404).json({ error: t('common.notFound', undefined, { defaultValue: 'Not found.' }) })
    return
  }
  const body = req.body as Record<string, unknown>
  const updates: Record<string, unknown> = { updated_at: new Date() }
  for (const k of ['label', 'street', 'city', 'postal_code', 'country']) {
    if (k in body) updates[k] = body[k]
  }
  if (typeof body.is_default === 'boolean') {
    updates.is_default = body.is_default
    if (body.is_default) {
      const peers = await findMany<Record<string, unknown>>('addresses', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'is_default', operator: '=', value: true },
        ],
        limit: 50,
      })
      for (const row of peers) {
        if (String(row.id) !== id) {
          await updateById('addresses', String(row.id), { is_default: false })
        }
      }
    }
  }
  if (typeof updates.street === 'string' || typeof updates.city === 'string') {
    const merged: Record<string, unknown> = {
      street: updates.street ?? existing.street,
      city: updates.city ?? existing.city,
    }
    await attachLatLng(merged)
    if (merged.lat != null) updates.lat = merged.lat
    if (merged.lng != null) updates.lng = merged.lng
  }
  const result = await updateById('addresses', id, updates)
  res.json(result.data ?? result)
})

router.post('/:id/default', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const rawId = req.params.id
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  const existing = await findById<Record<string, unknown>>('addresses', id)
  if (!existing || existing.user_id !== userId) {
    res.status(404).json({ error: t('common.notFound', undefined, { defaultValue: 'Not found.' }) })
    return
  }
  const peers = await findMany<Record<string, unknown>>('addresses', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'is_default', operator: '=', value: true },
    ],
    limit: 50,
  })
  for (const row of peers) {
    if (String(row.id) !== id) {
      await updateById('addresses', String(row.id), { is_default: false })
    }
  }
  await updateById('addresses', id, { is_default: true, updated_at: new Date() })
  res.json({ id, is_default: true })
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const rawId = req.params.id
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  const existing = await findById<Record<string, unknown>>('addresses', id)
  if (!existing || existing.user_id !== userId) {
    res.status(404).json({ error: t('common.notFound', undefined, { defaultValue: 'Not found.' }) })
    return
  }
  await deleteById('addresses', id)
  res.json({ removed: true })
})

export default router
