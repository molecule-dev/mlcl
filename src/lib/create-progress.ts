/**
 * Progress for the slow steps of `mlcl create`, so a caller never watches a silent command.
 *
 * A first `npm install` of a full-stack scaffold resolves about a thousand packages, and npm prints
 * nothing until it finishes. Under `--json` create printed nothing either. In a harness run on
 * 2026-11-22, Codex found the command silent with no package installed after a minute and a half,
 * took it for a hang, stopped it before the integration code was generated, and wired the app by
 * hand.
 *
 * @module
 */

/** How often a slow step says that it is still running. */
export const HEARTBEAT_MS = 30_000

/**
 * Run a slow step and report how long it has run, every `everyMs` until it settles.
 *
 * @param work - The step.
 * @param report - Called with the whole seconds elapsed at each beat.
 * @param options - The interval, and the clock (tests).
 * @param options.everyMs - The interval between reports (default {@link HEARTBEAT_MS}).
 * @param options.now - The clock, in milliseconds (default `Date.now`).
 * @returns What the step returns; a rejection is passed through.
 */
export async function withHeartbeat<T>(
  work: () => Promise<T>,
  report: (elapsedSeconds: number) => void,
  { everyMs = HEARTBEAT_MS, now = Date.now }: { everyMs?: number; now?: () => number } = {},
): Promise<T> {
  const start = now()
  const timer = setInterval(() => report(Math.round((now() - start) / 1000)), everyMs)
  // A beat must never keep the CLI alive once its work is done.
  timer.unref()
  try {
    return await work()
  } finally {
    clearInterval(timer)
  }
}
