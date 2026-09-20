import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership } from '../lib/authz.js'
import { asMap, shapeGift } from './_shape.js'

const router = Router()

export const GIFT_METHODS = ['check', 'card', 'cash', 'ach'] as const
export const GIFT_FUNDS = ['general', 'programs', 'equipment', 'capital', 'endowment'] as const

const createGiftSchema = z.object({
  donor_id: z.string().uuid(),
  amount_cents: z.number().int().positive().max(100_000_000),
  gift_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(GIFT_METHODS),
  fund: z.enum(GIFT_FUNDS).default('general'),
  campaign_id: z.string().uuid().nullable().optional(),
  note: z.string().max(2000).optional(),
})

const updateGiftSchema = createGiftSchema.partial()

router.use(authorizers.auth())

/** Fetch donors + campaigns once and build name lookups for shaping. */
async function nameLookups(userId: string): Promise<{
  donors: Map<string, { name: string }>
  campaigns: Map<string, { name: string }>
}> {
  const [donors, campaigns] = await Promise.all([
    findMany<{ id?: string; name?: string }>('donors', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      limit: 10000,
    }),
    findMany<{ id?: string; name?: string }>('campaigns', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      limit: 10000,
    }),
  ])
  return {
    donors: asMap(
      donors.map((d) => ({ id: String(d.id), name: String(d.name ?? '') })),
      'id',
    ),
    campaigns: asMap(
      campaigns.map((c) => ({ id: String(c.id), name: String(c.name ?? '') })),
      'id',
    ),
  }
}

// List gifts — owner-scoped, newest first, with donor + campaign names.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { donor_id, campaign_id, method, year, receipted, page = '1', limit = '100' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (donor_id) where.push({ field: 'donor_id', operator: '=', value: String(donor_id) })
    if (campaign_id) where.push({ field: 'campaign_id', operator: '=', value: String(campaign_id) })
    if (method) where.push({ field: 'method', operator: '=', value: String(method) })
    if (year) {
      const y = Number(year)
      if (Number.isInteger(y)) {
        where.push({ field: 'gift_date', operator: '>=', value: `${y}-01-01` })
        where.push({ field: 'gift_date', operator: '<=', value: `${y}-12-31` })
      }
    }
    if (receipted === 'true') where.push({ field: 'receipt_id', operator: '!=', value: null })
    if (receipted === 'false') where.push({ field: 'receipt_id', operator: '=', value: null })

    const gifts = await findMany('gifts', {
      where,
      orderBy: [{ field: 'gift_date', direction: 'desc' }],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    })
    const { donors, campaigns } = await nameLookups(userId)
    res.json(
      gifts.map((g) => {
        const row = g as Record<string, unknown>
        const donor = donors.get(String(row.donor_id))
        const campaign = row.campaign_id ? campaigns.get(String(row.campaign_id)) : undefined
        return shapeGift(row, donor?.name ?? '', campaign ? campaign.name : null)
      }),
    )
  } catch (err) {
    logger.error('[gifts] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get gift details — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('gifts', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('gifts.notFound', {}, { defaultValue: 'Gift not found' }) })
      return
    }
    const { donors, campaigns } = await nameLookups(userId)
    const row = check.row as Record<string, unknown>
    const donor = donors.get(String(row.donor_id))
    const campaign = row.campaign_id ? campaigns.get(String(row.campaign_id)) : undefined
    res.json(shapeGift(row, donor?.name ?? '', campaign ? campaign.name : null))
  } catch (err) {
    logger.error('[gifts] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Record a gift. The donor (and campaign, when given) must belong to the
// caller — a gift pointing at another tenant's donor would leak giving
// history across accounts.
router.post('/', validateBody(createGiftSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof createGiftSchema>
    const donor = await requireOwnership('donors', body.donor_id, userId)
    if (!donor.ok) {
      res
        .status(donor.status)
        .json({ error: t('gifts.donorNotFound', {}, { defaultValue: 'Donor not found' }) })
      return
    }
    if (body.campaign_id) {
      const campaign = await requireOwnership('campaigns', body.campaign_id, userId)
      if (!campaign.ok) {
        res.status(campaign.status).json({
          error: t('gifts.campaignNotFound', {}, { defaultValue: 'Campaign not found' }),
        })
        return
      }
    }
    const now = new Date().toISOString()
    const result = await create('gifts', {
      owner_id: userId,
      donor_id: body.donor_id,
      amount_cents: body.amount_cents,
      gift_date: body.gift_date,
      method: body.method,
      fund: body.fund ?? 'general',
      campaign_id: body.campaign_id ?? null,
      receipt_id: null,
      note: body.note ?? '',
      created_at: now,
      updated_at: now,
    })
    const { donors, campaigns } = await nameLookups(userId)
    const row = result.data as Record<string, unknown>
    const donorRow = donors.get(String(row.donor_id))
    const campaign = row.campaign_id ? campaigns.get(String(row.campaign_id)) : undefined
    res.status(201).json(shapeGift(row, donorRow?.name ?? '', campaign ? campaign.name : null))
  } catch (err) {
    logger.error('[gifts] create failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Update a gift — owner-only. Amount and date are frozen once the gift is
// on a receipt (the receipt's total and line items would silently desync);
// edit those through the receipt instead (delete it, edit, regenerate).
router.put('/:id', validateBody(updateGiftSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('gifts', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('gifts.notFound', {}, { defaultValue: 'Gift not found' }) })
      return
    }
    const existing = check.row as Record<string, unknown>
    const body = req.body as z.infer<typeof updateGiftSchema>
    if (existing.receipt_id && (body.amount_cents !== undefined || body.gift_date !== undefined)) {
      res.status(409).json({
        error: t(
          'gifts.receiptedFrozen',
          {},
          {
            defaultValue:
              'This gift is on an issued receipt — delete the receipt before changing its amount or date.',
          },
        ),
      })
      return
    }
    if (body.campaign_id) {
      const campaign = await requireOwnership('campaigns', body.campaign_id, userId)
      if (!campaign.ok) {
        res.status(campaign.status).json({
          error: t('gifts.campaignNotFound', {}, { defaultValue: 'Campaign not found' }),
        })
        return
      }
    }
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.amount_cents !== undefined) updates.amount_cents = body.amount_cents
    if (body.gift_date !== undefined) updates.gift_date = body.gift_date
    if (body.method !== undefined) updates.method = body.method
    if (body.fund !== undefined) updates.fund = body.fund
    if (body.campaign_id !== undefined) updates.campaign_id = body.campaign_id ?? null
    if (body.note !== undefined) updates.note = body.note

    const result = await updateById('gifts', req.params.id as string, updates)
    const { donors, campaigns } = await nameLookups(userId)
    const row = result.data as Record<string, unknown>
    const donor = donors.get(String(row.donor_id))
    const campaign = row.campaign_id ? campaigns.get(String(row.campaign_id)) : undefined
    res.json(shapeGift(row, donor?.name ?? '', campaign ? campaign.name : null))
  } catch (err) {
    logger.error('[gifts] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete a gift — owner-only, blocked while receipted (same freeze rule).
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('gifts', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('gifts.notFound', {}, { defaultValue: 'Gift not found' }) })
      return
    }
    const existing = check.row as Record<string, unknown>
    if (existing.receipt_id) {
      res.status(409).json({
        error: t(
          'gifts.receiptedFrozen',
          {},
          {
            defaultValue:
              'This gift is on an issued receipt — delete the receipt before deleting the gift.',
          },
        ),
      })
      return
    }
    await deleteById('gifts', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[gifts] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
