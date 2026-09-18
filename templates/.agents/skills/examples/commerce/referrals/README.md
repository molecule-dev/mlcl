---
name: referrals
intent: |
  - "Referral codes"
  - "Invite link / share link with credit"
  - "Refer a friend"
  - "Affiliate program"
  - "Give $X get $X"
keywords: [referral, invite, share, affiliate, friend, credit]
---

# Referrals (give-X-get-X invite links)

**When to copy this example:** the user wants viral-loop referrals
where existing users invite friends and both get credit.

## What you'll install

Nothing extra — referrals are a `referral_code` column on the
framework `users` table + a `referrals` ledger + a `credits` ledger
(where the awards land) + custom award logic.

## Files in this example

| Path                            | What it does                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/handlers/referrals.ts`     | `GET /referrals/code` returns the user's unique invite code; `POST /referrals/redeem { code }` is called by signup if a `?ref=` param is present.                                                                                                                                                                                         |
| `api/lib/award.ts`              | `awardReferral(referredId)` — finds the caller's `pending` referral (the referrer is read off that row), writes two `credits` ledger entries (referrer + referred) each worth the configured reward, then flips the referral to `qualified`. Idempotent: once flipped, the pending lookup returns nothing, so a webhook retry is a no-op. |
| `app/components/InviteLink.tsx` | Renders share buttons with the user's link (`Copy`, `Email`, `WhatsApp`).                                                                                                                                                                                                                                                                 |

## Anti-patterns

- Do not invent `@molecule/api-referrals`. It's a table + a handler
  - an award helper.
- Do not let users self-refer. Reject on `referrer_id === referred_id`.
- Do not credit the reward at signup. Wait for a "qualified action"
  (paid subscription, first purchase) so freeloaders don't burn
  budget.
- Do not skip a unique constraint on `(referrer_id, referred_id)`
  — duplicate awards will happen if a webhook retries.
- Do not let the referrer rotate their code unless absolutely
  necessary. Old links break.

## Verify

User A's `/referrals/code` returns `JANE-G7K2`. A shares the link
`/signup?ref=JANE-G7K2` to user B. B signs up → `referrals` row
created (status: `pending`). B makes their first purchase →
status flips to `qualified` → both A and B get credit visible in
their account.
