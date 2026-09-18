---
name: promo-codes
intent: |
  - "Promo codes"
  - "Coupon codes"
  - "Discount codes"
  - "Apply a code at checkout"
  - "% off / $ off codes"
keywords: [coupon, promo, discount, code, redeem, voucher]
---

# Promo / coupon codes (validate + apply at checkout)

**When to copy this example:** the user wants codes that grant
discounts at checkout. Pairs with `commerce/stripe-checkout/` —
read that first.

## What you'll install

Nothing extra — promo codes are a `coupons` table + a
`coupon_redemptions` table + two endpoints (`validate`, `redeem`)

- a Stripe-side coupon when you create the checkout session.

## Validate vs. redeem (the split a weak model gets wrong)

There are **two** operations, and they are NOT the same call:

- `POST /coupons/validate { code }` — a **pure read**. Previews the
  discount for the UI. Must be **idempotent** — a shopper re-checking a
  code, fixing a typo, or abandoning the cart must NOT consume anything.
- `POST /coupons/redeem { code, order_id }` — the **consume**, called
  from the checkout success path once the order is **confirmed**. Records a
  `coupon_redemptions` row keyed by `order_id`, so a payment/webhook retry
  is idempotent (re-redeeming the same order is a no-op).

Exhaustion is measured by **counting redemption rows**, never a
`coupons.redemptions` counter — so previewing can't inflate it and the
count can't drift.

## Files in this example

| Path                             | What it does                                                                                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api/handlers/coupons.ts`        | `POST /coupons/validate` (pure read → `{ valid, percent_off?, amount_off?, expires_at? }`) and `POST /coupons/redeem` (consume at checkout, idempotent per `order_id`). Rejects expired/exhausted; counts `coupon_redemptions` rows. |
| `app/components/CouponField.tsx` | Input + Apply button; on validate success, displays the discount; passes `coupon_code` into the existing checkout payload (checkout calls `redeem`).                                                                                 |

## Anti-patterns

- Do not invent `@molecule/api-coupons`. It's a table + handler.
- Do not validate the code only on the client. The server must
  re-validate at checkout — codes can be exhausted between the
  user typing and pressing Pay.
- Do not store discount codes in plaintext if they're high-value.
  Hash codes that are bulk-issued (gift cards) so a DB leak
  doesn't reveal them.
- Do not let users apply two stacking codes unless your business
  logic supports it. Enforce one-per-checkout server-side.
- Do not forget to also create the coupon in Stripe (or your
  payments provider) — the discount has to flow through to the
  charged amount.

## Verify

User enters `LAUNCH20` → `validate` returns `{ valid: true,
percent_off: 20 }` → checkout shows discount → order confirmed →
checkout calls `redeem { code, order_id }` → Stripe charges 20% less.
Re-checking the same code with `validate` any number of times does NOT
change the redemption count. A code with `max_redemptions: 100` returns
`{ valid: false, reason: 'exhausted' }` on the 101st _redemption_ (not
the 101st validate), and re-`redeem`-ing an already-redeemed `order_id`
is a no-op.
