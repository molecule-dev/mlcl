/**
 * oclif init hook — records the command start time for the telemetry hooks.
 * Runs before every command; does nothing when telemetry is disabled.
 */
import { telemetryEnabled } from '../lib/telemetry.js'

export default async function init(_options: { id?: string }): Promise<void> {
  if (telemetryEnabled()) {
    ;(globalThis as { __mlclCommandStart?: number }).__mlclCommandStart = Date.now()
  }
}
