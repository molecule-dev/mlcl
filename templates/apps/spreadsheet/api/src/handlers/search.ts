/**
 * Workbook search — Flow 14 in INVENTORY.md.
 *
 * The route is wired here so the surface stays reachable when the
 * `@molecule/api-search-meilisearch` bond is unconfigured locally
 * (no MEILI_HTTP_ADDR). The implementation prefers the search bond
 * when present, falling back to a Postgres ILIKE on workbook title
 * scoped to the calling owner — adequate for unit + smoke coverage
 * without a live Meili index.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { hasProvider as hasSearch, search as searchDocs } from '@molecule/api-search'

interface SpreadsheetRow {
  id: string
  owner_id: string
  title: string
  description: string | null
  updated_at: string
}

const router = Router()

const searchQuerySchema = z.object({
  q: z.string().min(1),
})

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = searchQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  const q = parsed.data.q.trim()
  // This app does NOT populate a Meili index — it queries the search bond when
  // available and, on ANY provider error (e.g. index-not-found), falls through to
  // the Postgres ILIKE below, so search stays usable without a fully-indexed Meili
  // and a 5xx is never surfaced. (To use Meili's ranking/typo-tolerance instead, add
  // a `lib/search-index.ts` that index()es spreadsheets on write + backfills at
  // startup — see the full-text-search example — and the bond path becomes primary.)
  if (hasSearch()) {
    try {
      const result = await searchDocs('spreadsheets', {
        text: q,
        filters: { owner_id: ownerId },
      })
      res.json({ hits: result.hits ?? [] })
      return
    } catch (err) {
      console.warn('[search] bond fallback to ILIKE', err instanceof Error ? err.message : err)
    }
  }
  try {
    const hits = await findMany<SpreadsheetRow>('spreadsheets', {
      where: [
        { field: 'owner_id', operator: '=', value: ownerId },
        { field: 'title', operator: 'ilike', value: q },
      ],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 50,
    })
    res.json({ hits })
  } catch (err) {
    console.error('[search] failed', err instanceof Error ? err.message : err)
    res.status(500).json({
      error: t('search.error.list', {}, { defaultValue: 'Search failed' }),
    })
  }
})

export default router
