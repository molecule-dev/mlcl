---
name: feature-flags
intent: |
  - "Feature flags"
  - "A/B test"
  - "Gradual rollout"
  - "Turn features on for some users only"
  - "Beta toggle"
keywords: [feature-flag, ab-test, rollout, toggle, beta, kill-switch]
---

# Feature flags (boolean + percentage rollout)

**When to copy this example:** the user wants to ship features
behind toggles, run A/B tests, or do gradual rollouts. Different
from `auth/role-based-access/` (which is permission-driven).

## What you'll install

```bash
cd /workspace
npm install @molecule/api-feature-flags --workspace=api    # if it exists
# OR build it yourself: a flags table + a checkFlag(name, user) helper.
```

## Files in this example

| Path                       | What it does                                                                                                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/lib/flags.ts`         | `isEnabled('checkout_v2', user)` → boolean (one flag); `evaluateAll(user)` → `{ [name]: boolean }` (all flags). Caches in-memory for 60s.                                                             |
| `api/handlers/flags.ts`    | `GET /flags` → `{ [name]: boolean }`, every flag evaluated for the current user — the endpoint `useFlag()` reads. Mount at `/api/flags` (optional-auth: logged-out visitors still get 100%-on flags). |
| `api/handlers/checkout.ts` | Routes through `isEnabled('checkout_v2', user)` to old vs new handler. Mount at `/api/checkout`.                                                                                                      |
| `app/hooks/useFlag.ts`     | `const enabled = useFlag('new-dashboard')` — fetches `/api/flags` once on mount, shared across callers.                                                                                               |

### The `feature_flags` table

`lib/flags.ts` reads flags from a `feature_flags` table — ship this migration (it
is NOT a pre-built resource, so the scaffolder won't create it for you):

```sql
CREATE TABLE feature_flags (
  name               TEXT PRIMARY KEY,
  enabled            BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER NOT NULL DEFAULT 0,  -- 0..100
  updated_at         TEXT NOT NULL
);
```

## Anti-patterns

- Do not check flags in tight loops without caching. `checkFlag()`
  must hit a cache, not the DB, on every request.
- Do not use feature flags as access control. RBAC has different
  semantics (denies; flags toggle a code path). Don't conflate.
- Do not invent `@molecule/api-launchdarkly` or
  `@molecule/api-flagsmith`. Use those vendors' own SDKs directly
  if you need the hosted version, or build a `flags` table.
- Do not let flags accumulate. Every flag is a code path you have
  to maintain — flip them off and delete the dead branch.
- Do not check a server-only flag from the client by reading the DB or
  env directly. Go through the shipped `GET /api/flags` endpoint
  (`handlers/flags.ts`) — it evaluates each flag server-side for the
  current user, and that's exactly what `useFlag()` reads.

## Verify

Set `checkout_v2` to enabled for 10% of users → ~10% of requests
hit the new handler. Flip kill-switch off → 0% within a minute (cache
TTL).
