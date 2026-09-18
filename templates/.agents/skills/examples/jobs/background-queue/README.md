---
name: background-queue
intent: |
  - "Process in the background"
  - "Background job / async work"
  - "Job queue / worker"
  - "Do X asynchronously, don't block the request"
  - "Offload slow work"
keywords: [queue, background, job, worker, async, enqueue, subscribe, bullmq, redis, offload]
---

# Background job queue (enqueue + worker)

**When to copy this example:** work that is slow or must not block the request —
processing an upload, sending a batch of emails, generating a report,
calling a slow third-party API. Enqueue it and return immediately; a worker
does it in the background. For TIME-BASED recurring work (nightly cleanup, a
daily digest at 3am), use `jobs/scheduled-tasks` (cron) instead.

## What you'll install

```bash
cd /workspace
# Queue core + the in-memory provider (fine for dev / a single node):
npm install @molecule/api-queue @molecule/api-queue-memory --workspace=api
# For production (durable, multi-node), swap to Redis/BullMQ:
npm install @molecule/api-queue-redis --workspace=api
```

## Files in this example

| Path                   | What it does                                                                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/handlers/jobs.ts` | `POST /jobs { kind, refId? }` — enqueues work with `send()` and returns **202 immediately** (never awaits the work). Body carries only ids, no secrets.                                         |
| `api/lib/worker.ts`    | `startJobWorker()` — registers a `subscribe()` consumer that processes each job. Idempotent (at-least-once safe), least-authority, transient-vs-permanent error handling. Call once at startup. |

## Bond wiring (api/bonds.ts or api/index.ts)

```typescript
import { setupQueueMemory } from '@molecule/api-bonds-default-express'
// prod: import { setupQueueRedis } from '@molecule/api-bonds-default-express'
import { startJobWorker } from './lib/worker.js'

await setupQueueMemory() // wire the queue bond (setupQueueRedis in prod)
startJobWorker() // register the worker ONCE, AFTER the bond is wired
```

Mount the handler under `/api/jobs`.

## Anti-patterns

- **Do not `await` the work in the request handler.** That defeats the queue —
  the request blocks on the slow work. `send()` and return 202; the worker does
  the work. If you're `await`ing the real workload in the route, you built a
  synchronous call with extra steps.
- **Make the handler IDEMPOTENT.** Delivery is at-least-once — a job can arrive
  twice (a retry after a crash / lost ack). Re-load the target and skip if the
  work is already done (a "processedAt" check, an `INSERT … ON CONFLICT DO
NOTHING`). A non-idempotent handler double-charges / double-sends on redelivery.
- **Prefer `subscribe()` over a `receive()` poll loop.** `subscribe()` delivers
  each message to exactly ONE consumer on every bond; `receive()`'s locking
  varies (the redis/BullMQ bond's `receive()` is a non-locking peek — two loops
  double-process). Use `receive()` only for a deliberate pull against a leasing
  bond.
- **Put only ids in the body, never secrets or full records.** The payload is
  persisted in the queue backend. Pass the owner id + a kind; the worker re-loads
  and re-scopes on the current data (a job runs outside a request — no session).
- **`throw` = retry; return = ack.** Throw only on a TRANSIENT error (a
  downstream 503) so it retries; catch a PERMANENT error and log-and-return so it
  doesn't loop forever (it dead-letters after the bond's `maxReceiveCount`). Drop
  an unknown job `kind` (log + return), never throw on it — that's a poison
  message that retries forever.
- Do not assume ordering or exactly-once unless the bonded provider guarantees
  it (use `groupId`/FIFO only when the bond supports it).

## Verify

Trigger `POST /api/jobs { "kind": "process-upload", "refId": "…" }` → the request
returns 202 immediately (does NOT block on the work) → the worker's side effect
appears shortly after (in the sandbox, its `logger` line / the real effect). A
job whose handler throws is retried, then dead-lettered — never silently lost.
