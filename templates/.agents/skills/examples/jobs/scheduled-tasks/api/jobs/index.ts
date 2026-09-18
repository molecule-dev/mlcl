import { registerNightlyCleanup } from './nightly-cleanup.js'

/**
 * Registers every scheduled job. Call this ONCE at startup, AFTER the cron
 * provider is wired (`setupCron()` in `bonds/jobs-bullmq.ts`, which calls
 * `setProvider()`). Registration must NOT happen at import time — `schedule()`
 * throws "Cron provider not configured" if no provider is set yet — so the
 * bootstrap order is load-bearing:
 *
 *   await setupBonds()   // wires the cron provider (setProvider)
 *   await registerJobs() // NOW schedule the jobs — the provider exists
 *
 * Add new scheduled tasks here (import + await their register function).
 */
export async function registerJobs(): Promise<void> {
  await registerNightlyCleanup()
}
