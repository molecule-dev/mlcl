import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const searchQuerySchema = z.object({
  q: z.string().min(1, 'q is required'),
  limit: z.string().optional(),
})

const popularQuerySchema = z.object({
  limit: z.string().optional(),
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q, limit = '10' } = req.query as Record<string, string>
    const cap = Math.min(Math.max(Number(limit) || 10, 1), 50)

    // For 3-letter inputs match the IATA code exactly. For longer text
    // we run separate `ilike` substring queries against `name`, `city`,
    // and `iata_code` because the molecule findMany WHERE clause is
    // AND-only — so we union the results client-side.
    let airports: Array<Record<string, unknown>> = []
    if (q.length === 3 && /^[A-Za-z]{3}$/.test(q)) {
      airports = await findMany<Record<string, unknown>>('airports', {
        where: [{ field: 'iata_code', operator: '=', value: q.toUpperCase() }],
        orderBy: [{ field: 'name', direction: 'asc' }],
        limit: cap,
      })
    } else {
      const fields = ['name', 'city', 'iata_code'] as const
      const results = await Promise.all(
        fields.map((field) =>
          findMany<Record<string, unknown>>('airports', {
            where: [{ field, operator: 'ilike', value: q }],
            orderBy: [{ field: 'name', direction: 'asc' }],
            limit: cap,
          }),
        ),
      )
      const seen = new Set<string>()
      airports = []
      for (const list of results) {
        for (const row of list) {
          const id = String((row as { iata_code?: string }).iata_code ?? '')
          if (id && !seen.has(id)) {
            seen.add(id)
            airports.push(row)
          }
        }
      }
      airports = airports.slice(0, cap)
    }
    res.json(airports)
  } catch (err) {
    console.error('[airports.search] failed:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/popular', validateQuery(popularQuerySchema), async (req: Request, res: Response) => {
  try {
    const { limit = '20' } = req.query as Record<string, string | undefined>
    const cap = Math.min(Math.max(Number(limit) || 20, 1), 100)
    const popular = await findMany<Record<string, unknown>>('airports', {
      where: [{ field: 'popular', operator: '=', value: true }],
      orderBy: [{ field: 'traffic_rank', direction: 'asc' }],
      limit: cap,
    })
    res.json(popular)
  } catch (err) {
    console.error('[airports.popular] failed:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
