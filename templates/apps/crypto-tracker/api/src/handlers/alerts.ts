import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { CryptoTrackerLimits } from '../tiers.js'

const router = Router()

interface AlertRow {
  id: string
  user_id: string
  coin_id: string | null
  symbol: string
  condition: string
  target_price: number | string | null
  is_active: boolean
  channels: unknown
  repeat: string
  notes: string | null
  triggered_at: Date | string | null
  created_at: Date | string
}

const CONDITION_DB_TO_UI: Record<string, string> = {
  above: 'above',
  below: 'below',
  '24h_change_above': 'change_24h_above',
  volume_spike: 'volume_above',
}

/**
 * Map a stored alert row to the UI contract expected by
 * `<AlertConditionCard />`. The DB uses `is_active` / `target_price`
 * (matching the squashed migration) while the card reads `active` /
 * `threshold` / `coin_name`.
 */
async function decorateAlert(row: AlertRow): Promise<Record<string, unknown>> {
  const coin = await findOne<{ name: string }>('coins', [
    { field: 'symbol', operator: '=', value: row.symbol.toLowerCase() },
  ])
  return {
    id: row.id,
    symbol: row.symbol.toUpperCase(),
    coin_name: coin?.name ?? row.symbol.toUpperCase(),
    condition: CONDITION_DB_TO_UI[row.condition] ?? row.condition,
    threshold: row.target_price !== null ? Number(row.target_price) : 0,
    active: !!row.is_active,
    triggered_at: row.triggered_at,
    created_at: row.created_at,
    channels: row.channels,
    repeat: row.repeat,
  }
}

const createAlertSchema = z.object({
  coin_id: z.string().optional(),
  symbol: z.string().min(1),
  condition: z.enum(['above', 'below', '24h_change_above', 'volume_spike']),
  target_price: z.number().nullable().optional(),
  channels: z.array(z.enum(['email', 'push', 'sms'])).optional(),
  repeat: z.enum(['one-time', 'recurring']).optional(),
  notes: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const rows = await findMany<AlertRow>('price_alerts', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const decorated = await Promise.all(rows.map(decorateAlert))
    res.json(decorated)
  } catch (err) {
    console.error('[crypto-tracker] alerts handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

// Enforce the per-tier alert cap (tiers.ts maxAlerts) — defined + shown on Pricing but enforceLimit
// was never called, so any tier could create unlimited price alerts.
const enforceAlertLimit = enforceLimit<CryptoTrackerLimits>({
  limitType: 'maxAlerts',
  getLimit: (limits) => limits.maxAlerts,
  getCurrent: async (userId) =>
    count('price_alerts', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceAlertLimit,
  validateBody(createAlertSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

      const { coin_id, symbol, condition, target_price, channels, repeat, notes } = req.body
      // `channels` is a JSONB column; pg auto-converts JS arrays to Postgres
      // array literals (`{email}`) which is not valid JSON, so we stringify
      // explicitly. See medication-reminder/handlers/medications.ts for the
      // same pattern.
      const result = await create<AlertRow>('price_alerts', {
        user_id: userId,
        coin_id: coin_id ?? null,
        symbol: String(symbol).toLowerCase(),
        condition,
        target_price: target_price ?? null,
        channels: JSON.stringify(channels ?? ['email']),
        repeat: repeat ?? 'one-time',
        notes: notes ?? null,
        is_active: true,
        triggered_at: null,
        created_at: new Date(),
      })
      const row = (result.data ?? (result as unknown as AlertRow)) as AlertRow
      res.status(201).json(await decorateAlert(row))
    } catch (err) {
      console.error('[crypto-tracker] alerts.create failed', err)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const existing = await findById<AlertRow>('price_alerts', getParamId(req))
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('alerts.notFound') })
    }

    const updated = await updateById<AlertRow>('price_alerts', getParamId(req), {
      is_active: !existing.is_active,
    })
    const row = (updated.data ?? (updated as unknown as AlertRow)) as AlertRow
    res.json(await decorateAlert(row))
  } catch (err) {
    console.error('[crypto-tracker] alerts handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const existing = await findById<Record<string, unknown>>('price_alerts', getParamId(req))
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('alerts.notFound') })
    }

    await deleteById('price_alerts', getParamId(req))
    res.status(204).end()
  } catch (err) {
    console.error('[crypto-tracker] alerts handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
