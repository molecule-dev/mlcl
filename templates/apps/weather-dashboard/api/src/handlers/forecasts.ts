import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import type { CurrentWeather, DailyForecast, HourlyForecast } from '@molecule/api-weather'
import {
  getCurrent as fetchCurrentWeather,
  getForecast as fetchDailyForecast,
  getHourly as fetchHourlyForecast,
  hasProvider as hasWeatherProvider,
} from '@molecule/api-weather'

const router = Router()

const CACHE_TTL_SECONDS = Number(process.env['FORECAST_CACHE_TTL']) || 1800

// WMO 4677 → Material Symbols icon name. The UI renders these directly
// inside a <span class="material-symbols-...">{icon}</span>, so the slug
// MUST match a real Material Symbol weather glyph.
const wmoIcon = (code: number): string => {
  if (code === 0) return 'sunny'
  if (code === 1 || code === 2) return 'partly_cloudy_day'
  if (code === 3) return 'cloud'
  if (code >= 45 && code <= 48) return 'foggy'
  if (code >= 51 && code <= 57) return 'rainy'
  if (code >= 61 && code <= 67) return 'rainy'
  if (code >= 71 && code <= 77) return 'snowing'
  if (code >= 80 && code <= 82) return 'rainy'
  if (code >= 85 && code <= 86) return 'snowing'
  if (code >= 95) return 'thunderstorm'
  return 'partly_cloudy_day'
}

const round = (value: number | null | undefined, digits = 1): number | null => {
  if (value == null || Number.isNaN(value)) return null
  const factor = Math.pow(10, digits)
  return Math.round(value * factor) / factor
}

const cToF = (celsius: number): number => (celsius * 9) / 5 + 32
const kmhToMph = (kmh: number): number => kmh * 0.621371

interface LocationRow {
  id: string
  user_id: string
  latitude: number
  longitude: number
  timezone: string | null
}

/**
 * Loads a location and asserts the calling user owns it.
 * Returns null + sends 401/404 to indicate the caller should stop.
 */
async function loadOwnedLocation(
  req: Request,
  res: Response,
  paramName = 'locationId',
): Promise<LocationRow | null> {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return null
  }
  const param = req.params[paramName]
  const id = Array.isArray(param) ? param[0] : param
  if (!id) {
    res.status(404).json({
      error: t('forecasts.locationNotFound', {}, { defaultValue: 'Location not found' }),
    })
    return null
  }
  const row = (await findById<Record<string, unknown>>('locations', id)) as
    (Record<string, unknown> & { user_id?: string }) | null
  if (!row || row['user_id'] !== userId) {
    res.status(404).json({
      error: t('forecasts.locationNotFound', {}, { defaultValue: 'Location not found' }),
    })
    return null
  }
  return {
    id: String(row['id']),
    user_id: String(row['user_id']),
    latitude: Number(row['latitude']),
    longitude: Number(row['longitude']),
    timezone: (row['timezone'] as string | null) ?? null,
  }
}

const mapCurrentToRow = (reading: CurrentWeather, locationId: string): Record<string, unknown> => {
  const now = new Date()
  return {
    location_id: locationId,
    observed_at: reading.time,
    temperature: round(cToF(reading.temperatureC)),
    feels_like: round(cToF(reading.feelsLikeC)),
    humidity: round(reading.humidity, 0),
    wind_speed: round(kmhToMph(reading.wind.speedKmh)),
    wind_dir: reading.wind.directionDeg,
    pressure: null,
    visibility: null,
    uv_index: null,
    condition: reading.summary,
    icon: wmoIcon(reading.code),
    fetched_at: now,
    ttl_expires_at: new Date(now.getTime() + CACHE_TTL_SECONDS * 1000),
  }
}

const mapHourlyToRow = (entry: HourlyForecast, locationId: string): Record<string, unknown> => ({
  location_id: locationId,
  hour_at: entry.time,
  temperature: round(cToF(entry.temperatureC)),
  feels_like: round(cToF(entry.feelsLikeC)),
  humidity: round(entry.humidity, 0),
  wind_speed: round(kmhToMph(entry.wind.speedKmh)),
  precipitation_pct: round(entry.precipitationMm),
  condition: entry.summary,
  icon: wmoIcon(entry.code),
  fetched_at: new Date(),
})

const mapDailyToRow = (entry: DailyForecast, locationId: string): Record<string, unknown> => ({
  location_id: locationId,
  day_at: entry.date,
  temp_high: round(cToF(entry.temperatureMaxC)),
  temp_low: round(cToF(entry.temperatureMinC)),
  humidity: round(entry.humidity, 0),
  wind_speed: round(kmhToMph(entry.wind.speedKmh)),
  precipitation_pct: round(entry.precipitationMm),
  condition: entry.summary,
  icon: wmoIcon(entry.code),
  sunrise: null,
  sunset: null,
  fetched_at: new Date(),
})

/** Fetch current observation from the weather provider and persist it. */
const refreshCurrent = async (location: LocationRow): Promise<Record<string, unknown> | null> => {
  if (!hasWeatherProvider()) return null
  const reading = await fetchCurrentWeather({
    lat: location.latitude,
    lon: location.longitude,
    ...(location.timezone ? { timezone: location.timezone } : {}),
  })
  const row = mapCurrentToRow(reading, location.id)
  const result = await create('forecast_current', row)
  return (result.data ?? result) as Record<string, unknown>
}

/** Fetch hourly forecast from provider; replace existing rows for this location. */
const refreshHourly = async (
  location: LocationRow,
  hours: number,
): Promise<Record<string, unknown>[]> => {
  if (!hasWeatherProvider()) return []
  const entries = await fetchHourlyForecast(
    {
      lat: location.latitude,
      lon: location.longitude,
      ...(location.timezone ? { timezone: location.timezone } : {}),
    },
    hours,
  )
  await deleteMany('forecast_hourly', [{ field: 'location_id', operator: '=', value: location.id }])
  const inserted: Record<string, unknown>[] = []
  for (const entry of entries) {
    const result = await create('forecast_hourly', mapHourlyToRow(entry, location.id))
    inserted.push((result.data ?? result) as Record<string, unknown>)
  }
  return inserted
}

/** Fetch daily forecast from provider; replace existing rows for this location. */
const refreshDaily = async (
  location: LocationRow,
  days: number,
): Promise<Record<string, unknown>[]> => {
  if (!hasWeatherProvider()) return []
  const entries = await fetchDailyForecast(
    {
      lat: location.latitude,
      lon: location.longitude,
      ...(location.timezone ? { timezone: location.timezone } : {}),
    },
    days,
  )
  await deleteMany('forecast_daily', [{ field: 'location_id', operator: '=', value: location.id }])
  const inserted: Record<string, unknown>[] = []
  for (const entry of entries) {
    const result = await create('forecast_daily', mapDailyToRow(entry, location.id))
    inserted.push((result.data ?? result) as Record<string, unknown>)
  }
  return inserted
}

const isCurrentFresh = (row: Record<string, unknown>): boolean => {
  const ttl = row['ttl_expires_at']
  if (!ttl) return false
  const expires = ttl instanceof Date ? ttl : new Date(String(ttl))
  return expires.getTime() > Date.now()
}

const isFetchedFresh = (row: Record<string, unknown>, ttlSeconds = CACHE_TTL_SECONDS): boolean => {
  const fetched = row['fetched_at']
  if (!fetched) return false
  const fetchedAt = fetched instanceof Date ? fetched : new Date(String(fetched))
  return Date.now() - fetchedAt.getTime() < ttlSeconds * 1000
}

router.get('/current/:locationId', async (req: Request, res: Response) => {
  const location = await loadOwnedLocation(req, res)
  if (!location) return

  const where: WhereCondition[] = [{ field: 'location_id', operator: '=', value: location.id }]
  const rows = await findMany<Record<string, unknown>>('forecast_current', {
    where,
    orderBy: [{ field: 'fetched_at', direction: 'desc' }],
    limit: 1,
  })

  let row = rows[0]
  if (!row || !isCurrentFresh(row)) {
    // Provider failures must not hang the request: fall back to the last
    // cached reading when one exists, 503 only when there is nothing.
    try {
      const fresh = await refreshCurrent(location)
      if (fresh) row = fresh
    } catch (error) {
      logger.error('forecasts.refreshCurrent', error)
    }
  }

  if (!row) {
    res.status(503).json({
      error: t(
        'forecasts.providerUnavailable',
        {},
        {
          defaultValue: 'Weather provider unavailable. Set OPENWEATHER_API_KEY and try again.',
        },
      ),
    })
    return
  }

  res.json(row)
})

router.get('/hourly/:locationId', async (req: Request, res: Response) => {
  const location = await loadOwnedLocation(req, res)
  if (!location) return

  const hours = Math.min(Number(req.query['hours']) || 24, 96)
  let forecasts = await findMany<Record<string, unknown>>('forecast_hourly', {
    where: [{ field: 'location_id', operator: '=', value: location.id }],
    orderBy: [{ field: 'hour_at', direction: 'asc' }],
    limit: hours,
  })

  const stale = forecasts.length === 0 || !isFetchedFresh(forecasts[0]!)
  if (stale) {
    try {
      const refreshed = await refreshHourly(location, hours)
      if (refreshed.length > 0) {
        forecasts = await findMany<Record<string, unknown>>('forecast_hourly', {
          where: [{ field: 'location_id', operator: '=', value: location.id }],
          orderBy: [{ field: 'hour_at', direction: 'asc' }],
          limit: hours,
        })
      }
    } catch (error) {
      // Serve whatever cached rows exist (possibly none — the page renders
      // its empty state) rather than leaving the request hanging.
      logger.error('forecasts.refreshHourly', error)
    }
  }

  res.json(forecasts)
})

router.get('/daily/:locationId', async (req: Request, res: Response) => {
  const location = await loadOwnedLocation(req, res)
  if (!location) return

  const days = Math.min(Number(req.query['days']) || 7, 14)
  let forecasts = await findMany<Record<string, unknown>>('forecast_daily', {
    where: [{ field: 'location_id', operator: '=', value: location.id }],
    orderBy: [{ field: 'day_at', direction: 'asc' }],
    limit: days,
  })

  const stale = forecasts.length === 0 || !isFetchedFresh(forecasts[0]!)
  if (stale) {
    try {
      const refreshed = await refreshDaily(location, days)
      if (refreshed.length > 0) {
        forecasts = await findMany<Record<string, unknown>>('forecast_daily', {
          where: [{ field: 'location_id', operator: '=', value: location.id }],
          orderBy: [{ field: 'day_at', direction: 'asc' }],
          limit: days,
        })
      }
    } catch (error) {
      // Serve whatever cached rows exist (possibly none — the page renders
      // its empty state) rather than leaving the request hanging.
      logger.error('forecasts.refreshDaily', error)
    }
  }

  res.json(forecasts)
})

const refreshSchema = z.object({
  hours: z.number().int().positive().max(96).optional(),
  days: z.number().int().positive().max(14).optional(),
})

router.post(
  '/refresh/:locationId',
  validateBody(refreshSchema),
  async (req: Request, res: Response) => {
    const location = await loadOwnedLocation(req, res)
    if (!location) return

    if (!hasWeatherProvider()) {
      res.status(503).json({
        error: t(
          'forecasts.providerUnavailable',
          {},
          {
            defaultValue: 'Weather provider unavailable. Set OPENWEATHER_API_KEY and try again.',
          },
        ),
      })
      return
    }

    const hours = Math.min(Number(req.body?.hours) || 24, 96)
    const days = Math.min(Number(req.body?.days) || 7, 14)

    // Each refresh is independently best-effort: a provider failure on one
    // series must not 500 the whole refresh when the others succeeded.
    let current: Record<string, unknown> | null = null
    let hourlyCount = 0
    let dailyCount = 0
    try {
      current = await refreshCurrent(location)
    } catch (error) {
      logger.error('forecasts.refreshCurrent', error)
    }
    try {
      hourlyCount = (await refreshHourly(location, hours)).length
    } catch (error) {
      logger.error('forecasts.refreshHourly', error)
    }
    try {
      dailyCount = (await refreshDaily(location, days)).length
    } catch (error) {
      logger.error('forecasts.refreshDaily', error)
    }

    await updateById('locations', location.id, {
      forecast_stale: false,
      updated_at: new Date(),
    })

    res.json({ current, hourly_count: hourlyCount, daily_count: dailyCount })
  },
)

router.post('/stale/:locationId', async (req: Request, res: Response) => {
  const location = await loadOwnedLocation(req, res)
  if (!location) return

  await updateById('locations', location.id, {
    forecast_stale: true,
    updated_at: new Date(),
  })

  res.json({
    message: t(
      'forecasts.markedStale',
      {},
      {
        defaultValue: 'Forecast marked as stale for next refresh',
      },
    ),
  })
})

export default router
