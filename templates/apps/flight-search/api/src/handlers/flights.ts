import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

// Accept both `depart_date` (handler-canonical) and `departure_date`
// (UI-historic) so old UI clients don't break. The hero search card
// emits `departure_date`; the handler treats them as equivalent.
const searchQuerySchema = z.object({
  origin: z.string().min(2).max(8).optional(),
  destination: z.string().min(2).max(8).optional(),
  depart_date: z.string().min(1).optional(),
  departure_date: z.string().min(1).optional(),
  return_date: z.string().optional(),
  passengers: z.string().optional(),
  cabin: z.enum(['economy', 'premium_economy', 'business', 'first']).optional(),
  stops: z.string().optional(),
  max_price: z.string().optional(),
  sort_by: z.enum(['price', 'duration_minutes', 'depart_at', 'departure_time']).optional(),
  trip_type: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

const calendarQuerySchema = z.object({
  origin: z.string().min(2).max(8),
  destination: z.string().min(2).max(8),
  month: z.string().optional(),
})

/**
 * Map a flight DB row into the shape the FlightResultCard / FlightDetail
 * components consume on the frontend. The DB uses `origin_iata` /
 * `destination_iata` / `depart_at` while the React components consume
 * `origin_code` / `destination_code` / `departure_time` (the historic
 * Skylark contract). Centralising the mapping here means handlers and
 * tests assert on the same shape the UI renders.
 */
function shapeFlight(row: Record<string, unknown>): Record<string, unknown> {
  const priceCents = Number(row.price_cents ?? 0)
  return {
    id: String(row.id ?? ''),
    airline: row.airline ?? '',
    airline_code: row.airline_code ?? null,
    airline_logo: row.airline_logo ?? null,
    flight_number: row.flight_number ?? '',
    origin_code: row.origin_iata ?? '',
    origin_iata: row.origin_iata ?? '',
    origin_city: row.origin_city ?? null,
    destination_code: row.destination_iata ?? '',
    destination_iata: row.destination_iata ?? '',
    destination_city: row.destination_city ?? null,
    depart_date: row.depart_date ?? null,
    departure_time: row.depart_at ?? null,
    arrival_time: row.arrive_at ?? null,
    depart_at: row.depart_at ?? null,
    arrive_at: row.arrive_at ?? null,
    duration_minutes: Number(row.duration_minutes ?? 0),
    stops: Number(row.stops ?? 0),
    stop_airports: Array.isArray(row.stop_airports) ? row.stop_airports : [],
    stop_cities: Array.isArray(row.stop_airports) ? row.stop_airports : [],
    cabin: row.cabin ?? 'economy',
    cabin_class: row.cabin ?? 'economy',
    price_cents: priceCents,
    price: priceCents / 100,
    currency: row.currency ?? 'USD',
    deal: row.deal ?? null,
    deal_label: row.deal ?? null,
    fare_class: row.fare_class ?? null,
    aircraft: row.aircraft ?? null,
    baggage_included: Boolean(row.baggage_included ?? true),
    refundable: Boolean(row.refundable ?? false),
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
  }
}

const multiCitySchema = z.object({
  legs: z
    .array(
      z.object({
        origin: z.string().min(2).max(8),
        destination: z.string().min(2).max(8),
        date: z.string().min(1),
      }),
    )
    .min(2),
  passengers: z.number().int().min(1).optional(),
  cabin: z.enum(['economy', 'premium_economy', 'business', 'first']).optional(),
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const q = req.query as Record<string, string | undefined>
    const origin = q.origin?.toUpperCase()
    const destination = q.destination?.toUpperCase()
    const departDate = q.depart_date ?? q.departure_date
    const returnDate = q.return_date
    const passengers = q.passengers ?? '1'
    const cabin = q.cabin ?? 'economy'
    const stops = q.stops
    const maxPrice = q.max_price
    const requestedSort = q.sort_by ?? 'price_cents'
    const page = q.page ?? '1'
    const limit = q.limit ?? '50'

    // Map UI-canonical sort keys → DB columns.
    const sortField =
      requestedSort === 'price'
        ? 'price_cents'
        : requestedSort === 'duration_minutes'
          ? 'duration_minutes'
          : requestedSort === 'departure_time' || requestedSort === 'depart_at'
            ? 'depart_at'
            : 'price_cents'

    const where: WhereCondition[] = []
    if (origin) where.push({ field: 'origin_iata', operator: '=', value: origin })
    if (destination) where.push({ field: 'destination_iata', operator: '=', value: destination })
    if (departDate) where.push({ field: 'depart_date', operator: '=', value: departDate })
    if (cabin) where.push({ field: 'cabin', operator: '=', value: cabin })
    if (stops !== undefined) where.push({ field: 'stops', operator: '<=', value: Number(stops) })
    if (maxPrice) where.push({ field: 'price_cents', operator: '<=', value: Number(maxPrice) })

    const orderBy: OrderBy[] = [{ field: sortField, direction: 'asc' }]
    const cap = Math.min(Math.max(Number(limit) || 50, 1), 100)

    const flights = await findMany<Record<string, unknown>>('flights', {
      where,
      orderBy,
      limit: cap,
      offset: (Math.max(Number(page), 1) - 1) * cap,
    })

    // Log the search for analytics + alert seeding (best-effort).
    if (userId && origin && destination && departDate) {
      try {
        await create('flight_search_logs', {
          user_id: userId,
          origin,
          destination,
          depart_date: departDate,
          return_date: returnDate ?? null,
          passengers: Number(passengers) || 1,
          cabin,
          searched_at: new Date(),
        })
      } catch (err) {
        // Analytics-only — never block the search response, but log so
        // we can spot persistent failures in dev.log.
        logger.warn('flights.search.logInsert', err)
      }
    }
    res.json(flights.map(shapeFlight))
  } catch (err) {
    logger.error('flights.search', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/multi-city', validateBody(multiCitySchema), async (req: Request, res: Response) => {
  try {
    const { legs, cabin = 'economy' } = req.body as z.infer<typeof multiCitySchema>
    const results = await Promise.all(
      legs.map(async (leg) => {
        const flights = await findMany<Record<string, unknown>>('flights', {
          where: [
            { field: 'origin_iata', operator: '=', value: leg.origin.toUpperCase() },
            { field: 'destination_iata', operator: '=', value: leg.destination.toUpperCase() },
            { field: 'depart_date', operator: '=', value: leg.date },
            { field: 'cabin', operator: '=', value: cabin },
          ],
          orderBy: [{ field: 'price_cents', direction: 'asc' }],
          limit: 10,
        })
        return { leg, flights: flights.map(shapeFlight) }
      }),
    )
    res.json(results)
  } catch (err) {
    logger.error('flights.multiCity', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/calendar', validateQuery(calendarQuerySchema), async (req: Request, res: Response) => {
  try {
    const { origin, destination, month } = req.query as Record<string, string | undefined>
    const where: WhereCondition[] = [
      { field: 'origin_iata', operator: '=', value: origin?.toUpperCase() },
      { field: 'destination_iata', operator: '=', value: destination?.toUpperCase() },
    ]
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [yearStr, monthStr] = month.split('-')
      const year = Number(yearStr)
      const monthNum = Number(monthStr)
      const firstDay = `${yearStr}-${monthStr}-01`
      const nextMonth =
        monthNum === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(monthNum + 1).padStart(2, '0')}-01`
      where.push({ field: 'depart_date', operator: '>=', value: firstDay })
      where.push({ field: 'depart_date', operator: '<', value: nextMonth })
    }
    const prices = await findMany<Record<string, unknown>>('flights', {
      where,
      orderBy: [{ field: 'depart_date', direction: 'asc' }],
      limit: 200,
    })
    res.json(prices.map(shapeFlight))
  } catch (err) {
    logger.error('flights.calendar', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// IMPORTANT: keep `/:id` LAST so static routes like `/search`,
// `/calendar`, and `/multi-city` are matched before this catch-all.
router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const flight = await findById<Record<string, unknown>>('flights', id)
    if (!flight) {
      return res.status(404).json({
        error: t('flight.notFound', {}, { defaultValue: 'Flight not found' }),
      })
    }
    res.json(shapeFlight(flight))
  } catch (err) {
    logger.error('flights.byId', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
