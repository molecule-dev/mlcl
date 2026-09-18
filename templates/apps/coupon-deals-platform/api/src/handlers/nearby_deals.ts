import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

import {
  effectiveRadiusKm,
  readNearbyPrefs,
  resolveFavoriteCategoryIds,
} from '../lib/nearby-filter.js'
import { decorateNearbyDeals } from './_decorate.js'

const router = Router()

const listSchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

router.get('/', validateQuery(listSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const limit = req.query.limit ? Number(req.query.limit) : 25

  // Honor the user's saved search preferences (Settings → radius + favorite
  // categories, stored in user_settings.preferences). The feed previously
  // ignored both, so changing either had no effect.
  const settings = await findOne<{ preferences?: unknown }>('user_settings', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  const prefs = readNearbyPrefs(settings?.preferences)
  const radiusKm = effectiveRadiusKm(
    req.query.radius ? Number(req.query.radius) : undefined,
    prefs.radiusKm,
  )
  let categoryIds: string[] = []
  if (prefs.favoriteCategories.length > 0) {
    const categories = await findMany<{ id: string; name?: string | null; slug?: string | null }>(
      'categories',
      { where: [{ field: 'status', operator: '=', value: 'active' }], limit: 100 },
    )
    categoryIds = resolveFavoriteCategoryIds(prefs.favoriteCategories, categories)
  }

  // Fetch a generous candidate pool so the radius/category filters still fill the limit.
  const rows = await findMany<Record<string, unknown>>('nearby_deals', {
    where: [{ field: 'user_id' as const, operator: '=' as const, value: userId }],
    orderBy: [{ field: 'distance_km', direction: 'asc' }],
    limit: Math.max(limit * 4, 50),
  })
  res.json(await decorateNearbyDeals(rows, { radiusKm, categoryIds, limit }))
})

export default router
