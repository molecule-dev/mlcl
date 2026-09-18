---
name: account-deletion
intent: |
  - "Delete my account"
  - "Account deletion / data erasure"
  - "GDPR right to be forgotten"
  - "Close my account"
  - "Wipe my data"
keywords: [delete, account, gdpr, erasure, close, wipe, deletion]
---

# Account deletion (soft-delete + scheduled hard-delete)

**When to copy this example:** the user wants users to be able to
delete their own accounts. Required for GDPR compliance + many
app-store policies.

## What you'll install

- `@molecule/api-cron` — cron scheduling core interface
- `@molecule/api-cron-node-cron` — node-cron provider (or swap for `@molecule/api-cron-bullmq` for distributed deployments)

Wire in `bonds.ts`:

```typescript
import { bond } from '@molecule/api-bond'
import { provider as cron } from '@molecule/api-cron-node-cron'
bond('cron', cron)
```

Then call `registerFinalizeDeletionsJob()` after bonding (see `api/jobs/finalize-deletions.ts`).

## Files in this example

| Path                              | What it does                                                                                                                                                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/handlers/me.ts`              | `GET /me` returns the signed-in user's email (for the confirm-your-email gate); `DELETE /me` flips `deleted_at` + signs the user out. Records the request in audit log.                                                                        |
| `api/jobs/finalize-deletions.ts`  | `registerFinalizeDeletionsJob()` — schedules a daily cron via `@molecule/api-cron`. Rows with `deleted_at < now() - 30 days` get hard-deleted, plus cascading purge of related records. Call once at startup, after bonding the cron provider. |
| `app/pages/DeleteAccountPage.tsx` | Confirmation flow (type your email to confirm) → DELETE → logged out.                                                                                                                                                                          |

## Anti-patterns

- Do not hard-delete on the user's request. 30-day grace period
  for accidental clicks + regulatory windows. Soft-delete first,
  hard-delete via cron.
- Do not invent `@molecule/api-gdpr`. GDPR compliance is a
  process + a deletion flow + an export flow (see
  `data-display/csv-export/`), not a package.
- Do not just orphan related records. Either cascade-delete or
  re-attribute to a sentinel "deleted user" account so foreign
  keys stay valid.
- Do NOT forget the credential table. The framework `usersSecrets`
  row (passwordHash + twoFactorSecret) has no `ON DELETE CASCADE`,
  so deleting the `users` row leaves the password hash behind — the
  exact data a "delete my account" flow must erase. Purge it
  explicitly (`usersSecrets.id` IS the user id) plus `devices`
  (keyed `userId`, not `user_id`).
- Do not let the cron crash on a table that doesn't exist. Wrap each
  purge in try/catch — one missing/renamed table would otherwise
  throw and freeze EVERY pending hard-delete indefinitely.
- Do not retain logs / metrics that re-identify the user past the
  grace period. Anonymize at hard-delete time.
- Do not block account deletion behind a "talk to support" link.
  Regulators see that as obstruction.

## Verify

User clicks Delete account → confirms email → request 200s →
session ends → re-login fails (invalid credentials) → 31 days
later, daily job hard-deletes the row + related → all FKs cleaned.
