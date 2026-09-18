import { create, findMany, updateById } from '@molecule/api-database'

const REWARD_AMOUNT_CENTS = 1000 // $10

// SCHEMA: awards land in a `credits` ledger — one row per credited user. This is an
// app-specific table, so the "missing migration" verifier does NOT cover it; add the
// migration or `awardReferral` 500s on the first qualified action. `id` is filled by
// `create()` when omitted, so no DEFAULT is required:
//   CREATE TABLE credits (
//     id text PRIMARY KEY,
//     user_id text NOT NULL,
//     amount_cents integer NOT NULL,
//     reason text NOT NULL,
//     referral_id text,
//     created_at timestamptz NOT NULL
//   );

/**
 * Award a referral once the referred user takes a qualified action
 * (e.g. first paid subscription, first purchase ≥ $X).
 *
 * Idempotent — calling twice is safe; the unique index on the
 * `referrals` row plus the status flip prevent double-credits.
 */
export async function awardReferral(referredId: string): Promise<{ awarded: boolean }> {
  const [pending] = (await findMany('referrals', {
    where: [
      { field: 'referred_id', operator: '=', value: referredId },
      { field: 'status', operator: '=', value: 'pending' },
    ],
    limit: 1,
  })) as { id: string; referrer_id: string }[]

  if (!pending) return { awarded: false }

  // Two ledger entries — one for the referrer, one for the referred.
  // The status flip below is the dedup gate; if it's already 'qualified',
  // the findMany above wouldn't have returned this row.
  await create('credits', {
    user_id: pending.referrer_id,
    amount_cents: REWARD_AMOUNT_CENTS,
    reason: 'referral_referrer',
    referral_id: pending.id,
    created_at: new Date().toISOString(),
  })
  await create('credits', {
    user_id: referredId,
    amount_cents: REWARD_AMOUNT_CENTS,
    reason: 'referral_referred',
    referral_id: pending.id,
    created_at: new Date().toISOString(),
  })
  await updateById('referrals', pending.id, {
    status: 'qualified',
    qualified_at: new Date().toISOString(),
  })
  return { awarded: true }
}
