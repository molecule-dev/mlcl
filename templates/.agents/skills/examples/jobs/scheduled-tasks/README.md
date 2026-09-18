---
name: scheduled-tasks
intent: |
  - "Run a job every night"
  - "Cron / scheduled task"
  - "Background job"
  - "Daily / hourly batch process"
  - "Periodic cleanup"
keywords: [cron, schedule, job, batch, periodic, nightly, hourly, queue]
---

# Scheduled tasks (cron-style background jobs)

**When to copy this example:** the user wants periodic work — nightly
report generation, hourly cleanup, retry queues, weekly digests.

## What you'll install

```bash
cd /workspace
npm install @molecule/api-cron @molecule/api-cron-bullmq --workspace=api
# For a lightweight single-process alternative (no Redis required):
# npm install @molecule/api-cron @molecule/api-cron-node-cron --workspace=api
```

## Files in this example

| Path                          | What it does                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/bonds/jobs-bullmq.ts`    | Calls `setProvider(createProvider(...))` to wire the BullMQ cron provider. Runs inside `setupBonds()`.                                                                                                                                                                                                                     |
| `api/jobs/index.ts`           | Exports `registerJobs()` — schedules every job. **Call it AFTER `setupBonds()`** (see "Wiring" below), never at import time.                                                                                                                                                                                               |
| `api/jobs/nightly-cleanup.ts` | Exports `registerNightlyCleanup()` — the cron pattern via `schedule()` at 03:00 daily. Its `CLEANUP_TABLE`/`EXPIRY_COLUMN` are a PLACEHOLDER — point them at a table your app actually has (there is no framework `sessions` table); the DB work is wrapped so a wrong table logs instead of failing silently every night. |

## Wiring (ORDER MATTERS)

`schedule()` calls `getProvider()`, which **throws** "Cron provider not configured"
if no provider is set yet. So jobs must be scheduled AFTER the provider is wired —
never at module-import time. Register them explicitly from `registerJobs()`:

```typescript
// server bootstrap
await setupBonds() // wires the cron provider (setProvider) — must be first
await registerJobs() // NOW schedule the jobs — the provider exists
```

Do NOT `import './jobs/index.js'` for its side effects: a static import is evaluated
BEFORE the bootstrap body runs, so any `schedule()` at that module's top level fires
before `setupBonds()` and crashes the server on boot. The `registerJobs()` function
keeps the order explicit and safe.

## Anti-patterns

- Do not use `setInterval()` in your API process for periodic
  work. It dies if the process restarts and runs N times if you
  scale to N instances.
- Do not invent `@molecule/api-jobs` or `@molecule/api-jobs-bullmq` — those
  packages do not exist. Use `@molecule/api-cron` (core) +
  `@molecule/api-cron-bullmq` (BullMQ provider) or
  `@molecule/api-cron-node-cron` (in-process provider).
- Do not skip idempotency. A job may run twice (retry, scaling).
  Design every handler so a duplicate run is a no-op.
- Do not catch every error and continue. Failures should escalate
  (alert, retry policy, dead-letter queue) — silent failures rot
  the whole pipeline.
- Do not run heavy work in the same process that serves HTTP.
  BullMQ workers should be separate processes.
- Do not call `schedule()` at module-import time (a top-level `await schedule(...)`
  - a static side-effect `import './jobs/index.js'`). It runs before `setupBonds()`
    wires the provider → `getProvider()` throws → the server won't boot. Schedule from
    `registerJobs()`, called AFTER `setupBonds()`.

## Verify

First point `CLEANUP_TABLE`/`EXPIRY_COLUMN` at a real table in your app. Then
`docker compose up redis api` → at 03:00 the cleanup job fires → log shows
"nightly-cleanup: deleted N expired <table> rows" (or an error if the table/column
is wrong). Manually trigger via `import { runNow, list } from '@molecule/api-cron'`:

```typescript
const jobs = await list()
const job = jobs.find((j) => j.name === 'nightly-cleanup')
if (job) await runNow(job.id)
```
