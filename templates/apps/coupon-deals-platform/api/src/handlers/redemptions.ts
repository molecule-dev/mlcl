import crypto from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, findOne, query, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { hasStarted } from './_deal-window.js'

const router = Router()

const purchaseSchema = z.object({
  deal_id: z.string().min(1),
  quantity: z.number().min(1).optional(),
  payment_method_id: z.string().optional(),
})

const verifySchema = z.object({
  code: z.string().min(1),
})

// Purchase / save a coupon for a deal — authSelf-style: owner_user_id is
// the requesting user.
router.post('/', validateBody(purchaseSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const dealId = String(req.body.deal_id)
  const quantity = Number(req.body.quantity ?? 1)

  const deal = await findById<Record<string, unknown>>('deals', dealId)
  if (!deal) return res.status(404).json({ error: t('deal.notFound') })
  if (deal.status !== 'active') {
    return res.status(400).json({ error: t('deal.inactive') })
  }
  // A deal scheduled for the future (starts_at not yet reached) must not be purchasable — the list
  // paths hide it, and buying it directly by id was the remaining hole.
  if (!hasStarted(deal)) {
    return res.status(400).json({ error: t('deal.notYetActive') })
  }
  const expiresAt = deal.expires_at as string | Date | null
  if (expiresAt && new Date(expiresAt as string).getTime() < Date.now()) {
    return res.status(400).json({ error: t('deal.expired') })
  }
  if ((deal.remaining_quantity as number) < quantity) {
    return res.status(400).json({ error: t('deal.soldOut') })
  }

  const merchantId = deal.merchant_id as string
  const merchant = await findById<Record<string, unknown>>('merchants', merchantId)
  const purchasePrice = (deal.discounted_price as number) * quantity
  const savings = ((deal.original_price as number) - (deal.discounted_price as number)) * quantity

  // Reserve inventory ATOMICALLY before issuing any coupons. The read-above
  // `remaining_quantity < quantity` check is only a fast path; the JS read →
  // check → `updateById` absolute write it used to perform was a TOCTOU race:
  // N concurrent purchases each read the same remaining count, all passed the
  // guard, and all wrote `remaining - quantity` from the same stale base —
  // overselling the deal. A single conditional UPDATE that affects 0 rows when
  // stock is insufficient serializes concurrent purchases on the row and closes
  // the race. The abstract DataStore has no atomic decrement, so use raw SQL.
  const reservation = await query<{ remaining_quantity: number }>(
    `UPDATE deals
       SET remaining_quantity = remaining_quantity - $1
     WHERE id = $2 AND status = 'active' AND remaining_quantity >= $1
     RETURNING remaining_quantity`,
    [quantity, dealId],
  )
  if (reservation.rowCount === 0 || reservation.rows.length === 0) {
    return res.status(400).json({ error: t('deal.soldOut') })
  }

  const created: Record<string, unknown>[] = []
  for (let i = 0; i < quantity; i++) {
    const code = generateRedemptionCode()
    const qrToken = crypto.randomUUID()
    const result = await create<Record<string, unknown>>('redemptions', {
      user_id: userId,
      deal_id: dealId,
      merchant_id: merchantId,
      merchant_name: merchant?.business_name ?? null,
      code,
      qr_token: qrToken,
      qr_data: JSON.stringify({ code, deal_id: dealId, user_id: userId }),
      status: 'purchased',
      purchase_price: purchasePrice,
      savings_cents: savings,
      purchased_at: new Date(),
      saved_at: new Date(),
      expires_at: expiresAt ? new Date(expiresAt as string) : null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const row = (result.data ?? result) as Record<string, unknown>
    created.push(row)
    // Mirror into my_coupons projection.
    await create('my_coupons', {
      user_id: userId,
      redemption_id: row.id,
      deal_id: dealId,
      merchant_id: merchantId,
      code,
      status: 'active',
      saved_at: new Date(),
      created_at: new Date(),
    })
  }

  res.status(201).json({ redemptions: created, total_amount: purchasePrice })
})

// List the requesting user's redemptions (owner_user_id scope).
router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (req.query.status) {
    where.push({ field: 'status', operator: '=', value: String(req.query.status) })
  }
  const orderBy: OrderBy[] = [{ field: 'purchased_at', direction: 'desc' }]
  const items = await findMany('redemptions', { where, orderBy, limit: 100 })
  res.json(items)
})

// Merchant: list redemptions across their deals (authSelf-style scope).
router.get('/merchant/all', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const merchant = await findOne<Record<string, unknown>>('merchants', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (!merchant) {
    return res.status(403).json({ error: t('deal.merchantRequired') })
  }

  const where: WhereCondition[] = [{ field: 'merchant_id', operator: '=', value: merchant.id }]
  if (req.query.status) {
    where.push({ field: 'status', operator: '=', value: String(req.query.status) })
  }
  if (req.query.dealId) {
    where.push({ field: 'deal_id', operator: '=', value: String(req.query.dealId) })
  }
  const orderBy: OrderBy[] = [{ field: 'purchased_at', direction: 'desc' }]
  const items = await findMany('redemptions', { where, orderBy, limit: 100 })
  res.json(items)
})

// Verify a redemption code (merchant-side scan endpoint).
router.post('/verify', validateBody(verifySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const redemption = await findOne<Record<string, unknown>>('redemptions', [
    { field: 'code', operator: '=', value: String(req.body.code) },
  ])
  if (!redemption) {
    return res.status(404).json({ valid: false, error: t('redemption.invalidCode') })
  }
  if (redemption.status === 'redeemed') {
    return res.json({
      valid: false,
      error: t('redemption.alreadyRedeemed'),
      redeemed_at: redemption.redeemed_at,
    })
  }
  const expiresAt = redemption.expires_at as string | Date | null
  if (expiresAt && new Date(expiresAt as string).getTime() < Date.now()) {
    return res.json({ valid: false, error: t('redemption.codeExpired') })
  }

  const deal = await findById('deals', redemption.deal_id as string)
  res.json({ valid: true, redemption, deal })
})

// Get one redemption by id (owner_user_id scope: only the user can fetch
// their own redemption; merchant verification goes through /verify).
router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const redemption = await findById<Record<string, unknown>>('redemptions', getParamId(req))
  if (!redemption || redemption.user_id !== userId) {
    return res.status(404).json({ error: t('redemption.notFound') })
  }
  const deal = await findById('deals', redemption.deal_id as string)
  const merchant = await findById('merchants', redemption.merchant_id as string)
  res.json({ ...redemption, deal, merchant })
})

// Mark a coupon as redeemed (merchant-side action; ownership via
// merchants.user_id ensures only the merchant who owns the deal can flip
// the state).
router.post('/:id/redeem', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const redemption = await findById<Record<string, unknown>>('redemptions', id)
  if (!redemption) return res.status(404).json({ error: t('redemption.notFound') })

  const merchant = await findById<Record<string, unknown>>(
    'merchants',
    redemption.merchant_id as string,
  )
  if (!merchant || merchant.user_id !== userId) {
    return res.status(403).json({ error: t('deal.unauthorized') })
  }
  if (redemption.status === 'redeemed') {
    return res.status(400).json({ error: t('redemption.alreadyRedeemed') })
  }
  const expiresAt = redemption.expires_at as string | Date | null
  if (expiresAt && new Date(expiresAt as string).getTime() < Date.now()) {
    return res.status(400).json({ error: t('redemption.codeExpired') })
  }

  const result = await updateById('redemptions', id, {
    status: 'redeemed',
    redeemed_at: new Date(),
    updated_at: new Date(),
  })
  res.json(result.data ?? result)
})

function generateRedemptionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(12)
  let code = ''
  for (let i = 0; i < 12; i++) {
    code += chars[bytes[i] % chars.length]
  }
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`
}

export default router
