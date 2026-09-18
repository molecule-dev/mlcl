import { getLogger } from '@molecule/api-bond'
import { subscribe } from '@molecule/api-queue'

const logger = getLogger()

/**
 * Body of a background job. Keep it to IDS + a `kind` — NEVER secrets, tokens, or
 * a full record. The body is persisted in the queue backend, so pass an id and
 * re-load + re-scope the real data in the handler (owner id from the body,
 * re-checked server-side), so a job cannot act with stale authority.
 */
type JobBody = { userId: string; kind: 'process-upload' | 'send-digest'; refId?: string }

/**
 * Registers the background worker. Call ONCE at startup, AFTER the queue bond is
 * wired (see the README). Returns an unsubscribe function for graceful shutdown.
 *
 * Prefer `subscribe()` (this) over a `receive()` poll loop: subscribe delivers
 * each message to exactly ONE consumer on every bond, whereas `receive()`'s
 * locking varies by bond (the redis/BullMQ bond's `receive()` is a NON-locking
 * peek — two loops would double-process). See `@molecule/api-queue`'s docs.
 *
 * Delivery is AT-LEAST-ONCE: a job can arrive more than once (a retry after a
 * crash / a lost ack). So every branch is IDEMPOTENT — re-load the target and
 * skip if the work is already done. Returning normally ACKs the message. A THROW
 * re-queues it, so throw ONLY on a TRANSIENT error (a downstream 503) to retry,
 * and log-and-return on a PERMANENT one so it isn't retried forever (it
 * dead-letters after the bond's `maxReceiveCount`).
 */
export function startJobWorker(): () => void {
  return subscribe<JobBody>('jobs', async (msg) => {
    const { userId, kind, refId } = msg.body
    try {
      switch (kind) {
        case 'process-upload':
          // Re-load the record by refId, skip if already processed (idempotent),
          // then do the real work. Placeholder — replace with your workload.
          logger.info('job: process-upload', { userId, refId })
          break
        case 'send-digest':
          logger.info('job: send-digest', { userId })
          break
        default:
          // Unknown kind: log and RETURN (ack). Throwing would retry forever a
          // job no handler can process — a poison message.
          logger.warn('job: unknown kind, dropping', { kind })
      }
    } catch (error) {
      // Transient failure — rethrow to retry (bounded by the bond's DLQ/retry
      // limit). A PERMANENT failure should be caught here and logged+returned so
      // it doesn't loop forever.
      logger.error('job failed — will retry', { kind, userId, error })
      throw error
    }
  })
}
