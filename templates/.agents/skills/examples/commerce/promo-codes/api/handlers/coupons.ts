import { Router } from 'express'
import { z } from 'zod'

import { count, create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

/**
 * Promo / coupon codes — TWO distinct operations that a weak executor tends to
 * conflate:
 *
 *   • POST /validate  — a PURE READ. Checks the code exists, isn't expired, and
 *     isn't exhausted, then returns the discount so the UI can preview it. It
 *     must be IDEMPOTENT: a shopper re-checking a code, fixing a typo, or
 *     abandoning the cart must NOT consume anything. Never mutate here.
 *   • POST /redeem    — the CONSUME step, called once the order is CONFIRMED
 *     (from the checkout success path), never at preview time. It records a
 *     redemption row keyed by `order_id`, so a payment retry is idempotent.
 *
 * Exhaustion is measured by COUNTING `coupon_redemptions` rows, not a
 * denormalised `coupons.redemptions` counter — so the count can never drift and
 * previewing never inflates it.
 *
 * Schema:
 *   coupons(code TEXT unique, percent_off INT?, amount_off INT?,
 *           expires_at TIMESTAMPTZ?, max_redemptions INT?)
 *   coupon_redemptions(id, coupon_id, order_id TEXT, user_id?, created_at)
 *     -- unique(coupon_id, order_id) enforces idempotency at the DB layer too.
 */

type CouponRow = {
  id: string
  expires_at?: string
  max_redemptions?: number
  percent_off?: number
  amount_off?: number
}

const codeSchema = z.object({ code: z.string().min(1).max(64) })
const redeemSchema = z.object({
  code: z.string().min(1).max(64),
  order_id: z.string().min(1).max(128),
})

const router = Router()

/** Look up a coupon by code and reject missing / expired ones. */
async function loadUsableCoupon(
  rawCode: string,
): Promise<{ coupon: CouponRow } | { error: { status: number; reason: string } }> {
  const code = rawCode.trim().toUpperCase()
  const [coupon] = (await findMany('coupons', {
    where: [{ field: 'code', operator: '=', value: code }],
    limit: 1,
  })) as CouponRow[]

  if (!coupon) {
    return {
      error: {
        status: 404,
        reason: t('coupons.notFound', undefined, { defaultValue: 'Code not found' }),
      },
    }
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return {
      error: {
        status: 410,
        reason: t('coupons.expired', undefined, { defaultValue: 'Code expired' }),
      },
    }
  }
  return { coupon }
}

/** How many times this coupon has actually been redeemed (drift-free). */
async function redemptionCount(couponId: string): Promise<number> {
  return count('coupon_redemptions', [{ field: 'coupon_id', operator: '=', value: couponId }])
}

// PURE READ — preview the discount. No mutation, safe to call repeatedly.
router.post('/validate', async (req, res) => {
  const parsed = codeSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      valid: false,
      reason: t('coupons.invalid', undefined, { defaultValue: 'Invalid code' }),
    })
  }

  const loaded = await loadUsableCoupon(parsed.data.code)
  if ('error' in loaded) {
    return res.status(loaded.error.status).json({ valid: false, reason: loaded.error.reason })
  }
  const { coupon } = loaded

  if (coupon.max_redemptions && (await redemptionCount(coupon.id)) >= coupon.max_redemptions) {
    return res.status(409).json({
      valid: false,
      reason: t('coupons.exhausted', undefined, { defaultValue: 'Code exhausted' }),
    })
  }

  res.json({
    valid: true,
    percent_off: coupon.percent_off,
    amount_off: coupon.amount_off,
    expires_at: coupon.expires_at,
  })
})

// CONSUME — call from the checkout success path once the order is confirmed.
// Idempotent per order_id: retrying the same order does not double-consume.
router.post('/redeem', async (req, res) => {
  const parsed = redeemSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      redeemed: false,
      reason: t('coupons.invalid', undefined, { defaultValue: 'Invalid code' }),
    })
  }

  const loaded = await loadUsableCoupon(parsed.data.code)
  if ('error' in loaded) {
    return res.status(loaded.error.status).json({ redeemed: false, reason: loaded.error.reason })
  }
  const { coupon } = loaded

  // Idempotency: this order already redeemed this coupon → succeed without
  // consuming a second slot (safe under a Stripe webhook retry).
  const [existing] = await findMany('coupon_redemptions', {
    where: [
      { field: 'coupon_id', operator: '=', value: coupon.id },
      { field: 'order_id', operator: '=', value: parsed.data.order_id },
    ],
    limit: 1,
  })
  if (!existing) {
    if (coupon.max_redemptions && (await redemptionCount(coupon.id)) >= coupon.max_redemptions) {
      return res.status(409).json({
        redeemed: false,
        reason: t('coupons.exhausted', undefined, { defaultValue: 'Code exhausted' }),
      })
    }
    await create('coupon_redemptions', {
      coupon_id: coupon.id,
      order_id: parsed.data.order_id,
      user_id: res.locals.session?.userId ?? null,
      created_at: new Date().toISOString(),
    })
  }

  res.json({ redeemed: true, percent_off: coupon.percent_off, amount_off: coupon.amount_off })
})

export default router
