import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const SEVERITY_RANKS: Record<string, number> = {
  extreme: 4,
  severe: 3,
  moderate: 2,
  minor: 1,
}

async function userOwnsLocation(userId: string, locationId: string): Promise<boolean> {
  const loc = await findById<Record<string, unknown>>('locations', locationId)
  return !!loc && loc.user_id === userId
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const ownedLocations = await findMany<Record<string, unknown>>('locations', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1000,
    })
    const ownedIds = ownedLocations.map((l) => String(l.id))
    if (ownedIds.length === 0) return res.json([])

    const where: WhereCondition[] = [{ field: 'location_id', operator: 'in', value: ownedIds }]

    const status = req.query.status as string | undefined
    const severity = req.query.severity as string | undefined
    const filterLocation = req.query.location_id as string | undefined

    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (severity) where.push({ field: 'severity', operator: '=', value: severity })
    if (filterLocation) {
      if (!ownedIds.includes(filterLocation)) return res.json([])
      where.push({ field: 'location_id', operator: '=', value: filterLocation })
    }

    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const page = Math.max(Number(req.query.page) || 1, 1)

    const alerts = await findMany<Record<string, unknown>>('alerts', {
      where,
      orderBy: [{ field: 'starts_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })

    // Hide alerts the user has personally dismissed. `dismissed_alerts` is a
    // per-user side-channel, so we filter at read time rather than mutating
    // the source `alerts` row (other users may still want to see it).
    if (alerts.length === 0) return res.json([])
    const alertIds = alerts.map((a) => String(a.id))
    const dismissed = await findMany<Record<string, unknown>>('dismissed_alerts', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'alert_id', operator: 'in', value: alertIds },
      ],
      limit: alertIds.length,
    })
    const dismissedIds = new Set(dismissed.map((d) => String(d.alert_id)))
    res.json(alerts.filter((a) => !dismissedIds.has(String(a.id))))
  } catch (error) {
    logger.error('alerts.getAll', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/location/:locationId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const locationId = Array.isArray(req.params.locationId)
      ? req.params.locationId[0]
      : req.params.locationId
    if (!(await userOwnsLocation(userId, locationId))) {
      return res.status(404).json({
        error: t('alerts.notFound', {}, { defaultValue: 'Weather alert not found' }),
      })
    }

    const alerts = await findMany<Record<string, unknown>>('alerts', {
      where: [
        { field: 'location_id', operator: '=', value: locationId },
        { field: 'status', operator: '=', value: 'active' },
      ],
      orderBy: [
        { field: 'severity_rank', direction: 'desc' },
        { field: 'starts_at', direction: 'desc' },
      ],
    })
    if (alerts.length === 0) return res.json([])
    const alertIds = alerts.map((a) => String(a.id))
    const dismissed = await findMany<Record<string, unknown>>('dismissed_alerts', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'alert_id', operator: 'in', value: alertIds },
      ],
      limit: alertIds.length,
    })
    const dismissedIds = new Set(dismissed.map((d) => String(d.alert_id)))
    res.json(alerts.filter((a) => !dismissedIds.has(String(a.id))))
  } catch (error) {
    logger.error('alerts.getByLocation', error)
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
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const alert = await findById<Record<string, unknown>>('alerts', id)
    if (!alert) {
      return res.status(404).json({
        error: t('alerts.notFound', {}, { defaultValue: 'Weather alert not found' }),
      })
    }
    if (!(await userOwnsLocation(userId, String(alert.location_id)))) {
      return res.status(404).json({
        error: t('alerts.notFound', {}, { defaultValue: 'Weather alert not found' }),
      })
    }
    res.json(alert)
  } catch (error) {
    logger.error('alerts.getById', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

const createAlertSchema = z.object({
  location_id: z.string().min(1),
  kind: z.enum(['severe', 'watch', 'warning', 'advisory']).default('advisory'),
  severity: z.enum(['extreme', 'severe', 'moderate', 'minor']).default('moderate'),
  title: z.string().min(1),
  body: z.string().optional(),
  source: z.string().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional().nullable(),
})

router.post('/', validateBody(createAlertSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { location_id, kind, severity, title, body, source, starts_at, ends_at } = req.body
    if (!(await userOwnsLocation(userId, location_id))) {
      return res.status(404).json({
        error: t('alerts.notFound', {}, { defaultValue: 'Weather alert not found' }),
      })
    }

    const result = await create('alerts', {
      location_id,
      kind,
      severity,
      severity_rank: SEVERITY_RANKS[severity] ?? 2,
      title,
      body: body ?? '',
      source: source ?? 'system',
      status: 'active',
      starts_at: starts_at ? new Date(starts_at) : new Date(),
      ends_at: ends_at ? new Date(ends_at) : null,
    })
    res.status(201).json(result.data ?? result)
  } catch (error) {
    logger.error('alerts.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

const preferenceSchema = z.object({
  enabled: z.boolean().optional(),
  min_severity: z.enum(['extreme', 'severe', 'moderate', 'minor']).optional(),
  kinds: z.array(z.string()).optional(),
  channels: z.array(z.string()).optional(),
  quiet_hours: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional()
    .nullable(),
})

router.put(
  '/preferences/:locationId',
  validateBody(preferenceSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const locationId = Array.isArray(req.params.locationId)
        ? req.params.locationId[0]
        : req.params.locationId
      if (!(await userOwnsLocation(userId, locationId))) {
        return res.status(404).json({
          error: t('alerts.notFound', {}, { defaultValue: 'Weather alert not found' }),
        })
      }

      const existing = await findMany<Record<string, unknown>>('alert_preferences', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'location_id', operator: '=', value: locationId },
        ],
        limit: 1,
      })

      // node-postgres maps JS arrays → Postgres `text[]`, NOT JSONB. The
      // `kinds` / `channels` / `quiet_hours` columns are JSONB, so we must
      // hand the driver a JSON string for those columns or the INSERT/UPDATE
      // fails at the type-coercion step (returns 500).
      const jsonbFields = (data: Record<string, unknown>): Record<string, unknown> => {
        const out: Record<string, unknown> = { ...data }
        if (Array.isArray(out.kinds)) out.kinds = JSON.stringify(out.kinds)
        if (Array.isArray(out.channels)) out.channels = JSON.stringify(out.channels)
        if (out.quiet_hours && typeof out.quiet_hours === 'object') {
          out.quiet_hours = JSON.stringify(out.quiet_hours)
        }
        return out
      }

      const now = new Date()
      if (existing.length > 0) {
        const updated = await updateById(
          'alert_preferences',
          String(existing[0].id),
          jsonbFields({ ...req.body, updated_at: now }),
        )
        return res.json(updated.data ?? updated)
      }

      const created = await create(
        'alert_preferences',
        jsonbFields({
          user_id: userId,
          location_id: locationId,
          enabled: req.body.enabled ?? true,
          min_severity: req.body.min_severity ?? 'moderate',
          kinds: req.body.kinds ?? [],
          channels: req.body.channels ?? ['push'],
          quiet_hours: req.body.quiet_hours ?? null,
        }),
      )
      res.status(201).json(created.data ?? created)
    } catch (error) {
      logger.error('alerts.putPreferences', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.get('/preferences/:locationId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const locationId = Array.isArray(req.params.locationId)
      ? req.params.locationId[0]
      : req.params.locationId
    if (!(await userOwnsLocation(userId, locationId))) {
      return res.status(404).json({
        error: t('alerts.notFound', {}, { defaultValue: 'Weather alert not found' }),
      })
    }
    const matches = await findMany('alert_preferences', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'location_id', operator: '=', value: locationId },
      ],
      limit: 1,
    })
    if (matches.length === 0) {
      return res.json({
        enabled: false,
        min_severity: 'moderate',
        kinds: [],
        channels: ['push'],
      })
    }
    res.json(matches[0])
  } catch (error) {
    logger.error('alerts.getPreferences', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const alert = await findById<Record<string, unknown>>('alerts', id)
    if (!alert || !(await userOwnsLocation(userId, String(alert.location_id)))) {
      return res.status(404).json({
        error: t('alerts.notFound', {}, { defaultValue: 'Weather alert not found' }),
      })
    }
    await create('dismissed_alerts', {
      alert_id: id,
      user_id: userId,
      dismissed_at: new Date(),
    })
    res.json({
      message: t('alerts.dismissed', {}, { defaultValue: 'Alert dismissed' }),
    })
  } catch (error) {
    logger.error('alerts.dismiss', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// NOTE: Alert expiry is SYSTEM maintenance, not a per-user action, so it runs
// as a server-side cron job (see ./cron/expire-alerts.ts, registered once from
// setupBonds()). The former user-facing `POST /expire` route was removed: it
// swept + UPDATEd up to 1000 past-due alerts across EVERY tenant per call, so
// any authenticated user could mutate other users' alerts (a cross-tenant
// write with no ownership scoping). Global expiry now runs with system
// authority on a cron tick, never from a user request.

export default router
