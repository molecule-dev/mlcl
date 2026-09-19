/**
 * oclif postrun/command_error hook — emits the anonymous `cli.command` event
 * (name, outcome, duration) once the command finishes. Fire-and-forget.
 */
import { trackCliEvent } from '../lib/telemetry.js'

export default async function done(options: {
  id?: string
  Command?: { id?: string }
  error?: Error
}): Promise<void> {
  const start = (globalThis as { __mlclCommandStart?: number }).__mlclCommandStart
  if (start === undefined) return
  const command = options.Command?.id ?? options.id ?? 'unknown'
  trackCliEvent({
    command,
    ok: !options.error,
    durationMs: Date.now() - start,
    errorName: options.error?.constructor?.name,
  })
}
