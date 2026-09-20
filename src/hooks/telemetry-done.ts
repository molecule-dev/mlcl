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

  // Extract product metadata from the parsed flags — no PII, no user content,
  // just what capability was exercised. The platform allowlist gates storage.
  const g = globalThis as { __mlclTelemetryContext?: Record<string, string> }
  const ctx = g.__mlclTelemetryContext ?? {}
  g.__mlclTelemetryContext = undefined

  trackCliEvent({
    command,
    ok: !options.error,
    durationMs: Date.now() - start,
    errorName: options.error?.constructor?.name,
    template: ctx.template,
    packages: ctx.packages,
    searchQuery: ctx.searchQuery,
    harness: ctx.harness,
    projectType: ctx.projectType,
    framework: ctx.framework,
    loginMethod: ctx.loginMethod,
    deployOutcome: ctx.deployOutcome,
    swapFrom: ctx.swapFrom,
    swapTo: ctx.swapTo,
  })
}
