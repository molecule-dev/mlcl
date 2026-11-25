/**
 * Delivers one CLI telemetry event from a process of its own. `trackCliEvent` (./telemetry.ts)
 * starts it detached, so the command that produced the event exits without waiting on the
 * network. It bonds `@molecule/api-analytics` with the `@molecule/api-analytics-http` provider,
 * the same pair a scaffolded app uses; the provider gives up after 5 s.
 *
 * Usage: `node telemetry-send.js <collector URL> <event JSON>`
 *
 * @module
 */
import { fileURLToPath } from 'node:url'

import type { AnalyticsEvent } from '@molecule/api-analytics'

/**
 * Send one event to the collector, reporting a failure on stderr only under `MLCL_DEBUG=1`.
 *
 * @param url - The collector endpoint (`telemetryUrl()` in the command's process).
 * @param event - The event, already stripped of anything private.
 */
export async function deliverTelemetryEvent(url: string, event: AnalyticsEvent): Promise<void> {
  const { setProvider, track } = await import('@molecule/api-analytics')
  const { createHttpAnalyticsProvider } = await import('@molecule/api-analytics-http')
  setProvider(
    createHttpAnalyticsProvider({
      url,
      source: 'mlcl',
      onError: (error) => {
        if (process.env.MLCL_DEBUG === '1') console.error('[telemetry] emit failed:', error)
      },
    }),
  )
  await track(event)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [url, payload] = process.argv.slice(2)
  try {
    if (!url || !payload) throw new Error('usage: telemetry-send <collector URL> <event JSON>')
    await deliverTelemetryEvent(url, JSON.parse(payload) as AnalyticsEvent)
  } catch (error) {
    // Nothing waits on this process: a lost event is reported only to someone debugging it.
    if (process.env.MLCL_DEBUG === '1') console.error('[telemetry] not sent:', error)
  }
}
