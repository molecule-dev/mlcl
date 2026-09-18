import { type NextFunction, type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface WatchRow {
  id?: string
  user_id?: string
  symbol?: string
  name?: string | null
  asset_class?: string | null
  last_price_cents?: number | string | null
  day_change_pct?: number | string | null
  alert_direction?: 'above' | 'below' | null
  alert_threshold_cents?: number | string | null
  target_price?: number | string | null
  notes?: string | null
}

interface AssetRow {
  symbol: string
  name?: string | null
  asset_class?: string | null
  last_price_cents?: number | string | null
}

const num = (v: unknown, fallback = 0): number => {
  if (v == null) return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

async function loadAssetCatalog(symbols: string[]): Promise<Record<string, AssetRow>> {
  const dedup = Array.from(new Set(symbols)).filter(Boolean)
  if (dedup.length === 0) return {}
  const rows = (await findMany<AssetRow>('assets', {
    where: [{ field: 'symbol', operator: 'in', value: dedup }],
  })) as AssetRow[]
  const out: Record<string, AssetRow> = {}
  for (const r of rows) if (r.symbol) out[r.symbol] = r
  return out
}

function enrich(row: WatchRow, asset?: AssetRow): Record<string, unknown> {
  const last = num(asset?.last_price_cents)
  const lastPriceCents = last > 0 ? last : num(row.last_price_cents)
  return {
    ...row,
    name: row.name ?? asset?.name ?? row.symbol,
    asset_class: row.asset_class ?? asset?.asset_class ?? 'equity',
    last_price_cents: lastPriceCents,
    day_change_pct: num(row.day_change_pct, 0),
    alert_threshold_cents:
      row.alert_threshold_cents == null ? null : num(row.alert_threshold_cents),
    target_price: row.target_price == null ? null : num(row.target_price),
  }
}

const createWatchlistSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().optional(),
  asset_class: z.string().optional(),
  target_price: z.number().optional(),
  alert_direction: z.enum(['above', 'below']).optional(),
  alert_threshold_cents: z.number().optional(),
  notes: z.string().optional(),
})

const updateWatchlistSchema = createWatchlistSchema.partial()

router.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized') })
      return
    }

    const items = (await findMany<WatchRow>('watchlist', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })) as WatchRow[]
    const assets = await loadAssetCatalog(items.map((i) => i.symbol ?? ''))
    res.json(items.map((i) => enrich(i, assets[i.symbol ?? ''])))
  } catch (error) {
    logger.error('watchlist list failed', error)
    next(error)
  }
})

router.post(
  '/',
  validateBody(createWatchlistSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({ error: t('auth.unauthorized') })
        return
      }

      const {
        symbol,
        name,
        asset_class,
        target_price,
        alert_direction,
        alert_threshold_cents,
        notes,
      } = req.body as z.infer<typeof createWatchlistSchema>
      const upperSymbol = symbol.toUpperCase()

      // Reject duplicates: a unique index on (user_id, symbol) makes the SQL
      // throw, but a friendly 409 lets the UI show "already tracked" instead
      // of a generic 500.
      const existing = await findOne<WatchRow>('watchlist', [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'symbol', operator: '=', value: upperSymbol },
      ])
      if (existing) {
        res.status(409).json({ error: t('watchlist.alreadyExists') })
        return
      }

      const asset = (await findOne<AssetRow>('assets', [
        { field: 'symbol', operator: '=', value: upperSymbol },
      ])) as AssetRow | null

      const result = await create<WatchRow>('watchlist', {
        user_id: userId,
        symbol: upperSymbol,
        name: name ?? asset?.name ?? upperSymbol,
        asset_class: asset_class ?? asset?.asset_class ?? 'equity',
        last_price_cents: asset?.last_price_cents ?? null,
        target_price,
        alert_direction,
        alert_threshold_cents,
        notes,
        created_at: new Date(),
      })
      const inserted = ((result as { data?: WatchRow }).data ?? result) as WatchRow
      res.status(201).json(enrich(inserted, asset ?? undefined))
    } catch (error) {
      logger.error('watchlist create failed', error)
      next(error)
    }
  },
)

router.put(
  '/:id',
  validateBody(updateWatchlistSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({ error: t('auth.unauthorized') })
        return
      }

      const id = getParamId(req)
      const existing = await findById<WatchRow>('watchlist', id)
      if (!existing || existing.user_id !== userId) {
        res.status(404).json({ error: t('watchlist.notFound') })
        return
      }

      const { name, asset_class, target_price, alert_direction, alert_threshold_cents, notes } =
        req.body as z.infer<typeof updateWatchlistSchema>
      const updates: Record<string, unknown> = {}
      if (name !== undefined) updates.name = name
      if (asset_class !== undefined) updates.asset_class = asset_class
      if (target_price !== undefined) updates.target_price = target_price
      if (alert_direction !== undefined) updates.alert_direction = alert_direction
      if (alert_threshold_cents !== undefined) updates.alert_threshold_cents = alert_threshold_cents
      if (notes !== undefined) updates.notes = notes

      const result = await updateById('watchlist', id, updates)
      res.json((result as { data?: WatchRow }).data ?? result)
    } catch (error) {
      logger.error('watchlist update failed', error)
      next(error)
    }
  },
)

router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized') })
      return
    }

    const id = getParamId(req)
    const existing = await findById<WatchRow>('watchlist', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({ error: t('watchlist.notFound') })
      return
    }
    await deleteById('watchlist', id)
    res.status(204).end()
  } catch (error) {
    logger.error('watchlist delete failed', error)
    next(error)
  }
})

export default router
