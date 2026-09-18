import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership } from '../lib/authz.js'
import { seedDemoForUser } from './_seed.js'
import { shapeGeofence } from './_shape.js'

const router = Router()

const polygonPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

const createGeofenceSchema = z.object({
  name: z.string().min(1).max(200),
  kind: z.enum(['allowed', 'restricted']).optional(),
  polygon: z.array(polygonPointSchema).min(3).max(200),
  alert_on_enter: z.boolean().optional(),
  alert_on_exit: z.boolean().optional(),
})

const updateGeofenceSchema = createGeofenceSchema.partial()

router.use(authorizers.auth())

function boundingBox(polygon: Array<{ lat: number; lng: number }>): {
  min_lat: number
  max_lat: number
  min_lng: number
  max_lng: number
} {
  let minLat = polygon[0]?.lat ?? 0
  let maxLat = polygon[0]?.lat ?? 0
  let minLng = polygon[0]?.lng ?? 0
  let maxLng = polygon[0]?.lng ?? 0
  for (const p of polygon) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  return { min_lat: minLat, max_lat: maxLat, min_lng: minLng, max_lng: maxLng }
}

// List geofences — owner-scoped. Seeds demo data on first authenticated call.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { kind } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (kind) where.push({ field: 'kind', operator: '=', value: String(kind) })

    const fences = await findMany('geofences', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(fences.map((g) => shapeGeofence(g as Record<string, unknown>)))
  } catch (err) {
    logger.error('[geofences] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get geofence — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('geofences', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('geofences.notFound', {}, { defaultValue: 'Geofence not found' }),
      })
      return
    }
    res.json(shapeGeofence(check.row as Record<string, unknown>))
  } catch (err) {
    logger.error('[geofences] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create geofence — owner-only.
router.post('/', validateBody(createGeofenceSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof createGeofenceSchema>
    const bbox = boundingBox(body.polygon)
    const now = new Date().toISOString()

    const result = await create('geofences', {
      owner_id: userId,
      name: body.name,
      kind: body.kind ?? 'allowed',
      polygon_json: JSON.stringify(body.polygon),
      alert_on_enter: body.alert_on_enter ?? false,
      alert_on_exit: body.alert_on_exit ?? false,
      ...bbox,
      created_at: now,
      updated_at: now,
    })

    res.status(201).json(result.data)
  } catch (err) {
    logger.error('[geofences] create failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Update geofence — owner-only.
router.put('/:id', validateBody(updateGeofenceSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('geofences', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('geofences.notFound', {}, { defaultValue: 'Geofence not found' }),
      })
      return
    }
    const body = req.body as z.infer<typeof updateGeofenceSchema>
    const updates: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    }
    if (body.polygon) {
      updates.polygon_json = JSON.stringify(body.polygon)
      delete (updates as Record<string, unknown>).polygon
      Object.assign(updates, boundingBox(body.polygon))
    }
    const result = await updateById('geofences', req.params.id as string, updates)
    res.json(result.data)
  } catch (err) {
    logger.error('[geofences] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete geofence — owner-only.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('geofences', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('geofences.notFound', {}, { defaultValue: 'Geofence not found' }),
      })
      return
    }
    await deleteById('geofences', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[geofences] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
