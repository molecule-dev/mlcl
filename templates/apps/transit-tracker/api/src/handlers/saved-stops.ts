import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const createSchema = z.object({
  stop_code: z.string().min(1).max(8),
})

const stopParamSchema = z.object({
  code: z.string().min(1).max(8),
})

/**
 * GET /saved-stops — the signed-in user's saved stops, newest first, with
 * the full stop row joined so the list page needs no second request.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    interface SavedStopRow {
      id: string
      saved_at: unknown
      code: string
      name: string
      lat: number
      lng: number
      hub: boolean
    }
    const saved = await findMany<Record<string, unknown>>('saved_stops', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const stops = await findMany<Record<string, unknown>>('transit_stops', {})
    const stopByCode = new Map(stops.map((s) => [String(s.code), s]))
    const rows: SavedStopRow[] = []
    for (const row of saved) {
      const stop = stopByCode.get(String(row.stop_code ?? ''))
      if (!stop) continue
      rows.push({
        id: String(row.id ?? ''),
        saved_at: row.created_at,
        code: String(stop.code ?? ''),
        name: String(stop.name ?? ''),
        lat: Number(stop.lat ?? 0),
        lng: Number(stop.lng ?? 0),
        hub: Boolean(stop.hub ?? false),
      })
    }
    res.json(rows)
  } catch (err) {
    console.error('[savedStops.list] failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/** POST /saved-stops {stop_code} — idempotent save (unique per user+stop). */
router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const stopCode = String(req.body.stop_code).toUpperCase()
    const existing = await findMany<Record<string, unknown>>('saved_stops', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'stop_code', operator: '=', value: stopCode },
      ],
    })
    if (existing.length > 0) {
      return res.status(200).json({ id: String(existing[0].id ?? ''), stop_code: stopCode })
    }
    const stops = await findMany<Record<string, unknown>>('transit_stops', {
      where: [{ field: 'code', operator: '=', value: stopCode }],
    })
    if (stops.length === 0) {
      return res
        .status(404)
        .json({ error: t('stop.notFound', {}, { defaultValue: 'Stop not found' }) })
    }
    const result = await create<Record<string, unknown>>('saved_stops', {
      user_id: userId,
      stop_code: stopCode,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error('[savedStops.create] failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/** DELETE /saved-stops/:code — unsave by STOP code (not row id). */
router.delete('/:code', validateParams(stopParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const stopCode = String(getParamId(req, 'code')).toUpperCase()
    const existing = await findMany<Record<string, unknown>>('saved_stops', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'stop_code', operator: '=', value: stopCode },
      ],
    })
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ error: t('savedStop.notFound', {}, { defaultValue: 'Saved stop not found' }) })
    }
    for (const row of existing) {
      await deleteById('saved_stops', String(row.id))
    }
    res.status(204).end()
  } catch (err) {
    console.error('[savedStops.delete] failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
