import { Router } from 'express'
import { z } from 'zod'

import { geocode } from '@molecule/api-geolocation'
import { t } from '@molecule/api-i18n'
import { consume } from '@molecule/api-rate-limit'

const placeSchema = z.object({
  address: z.string().min(3).max(500),
})

const router = Router()

router.post('/', async (req, res) => {
  const parsed = placeSchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('places.invalid', undefined, { defaultValue: 'Invalid address' }) })
  }

  // geocode() is a METERED third-party call, and this proxy is usually open
  // (autocomplete runs on public checkout / contact forms). Throttle per client
  // BEFORE hitting the provider so a hot typeahead loop or abuse can't run up the
  // Mapbox bill or exhaust the quota (which would break geocoding for everyone).
  // Keyed by IP because there may be no session here; use the userId behind auth.
  const rl = await consume(`places:${req.ip ?? 'unknown'}`)
  if (!rl.allowed) {
    return res.status(429).json({
      error: t('places.rateLimited', undefined, {
        defaultValue: 'Too many address lookups — try again shortly.',
      }),
      retryAfter: rl.retryAfter,
    })
  }

  // geocode() returns GeoResult[] ordered by relevance; take the best match
  const results = await geocode(parsed.data.address)
  if (!results.length) {
    return res
      .status(404)
      .json({ error: t('places.notFound', undefined, { defaultValue: 'Address not found' }) })
  }

  const { lat, lng, formattedAddress } = results[0]
  res.json({ lat, lng, formatted: formattedAddress })
})

export default router
