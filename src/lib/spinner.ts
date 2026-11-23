/**
 * A progress spinner that animates only on a terminal.
 *
 * clack's spinner redraws its frame with cursor escapes several times a second, and it stops only
 * when `CI=true`, not when its output is a pipe. Read by a harness, a pipe or a log, every redraw
 * is text: one `mlcl add --inject` run by Claude Code on 2026-11-23 put a dozen
 * `\x1b[1G\x1b[J◒  Executing injection` copies into the agent's context. Off a terminal, this
 * prints each step's start and end message once, as plain lines.
 *
 * Commands take their spinner from here, never from `@clack/prompts` directly.
 *
 * @module
 */

import * as p from '@clack/prompts'

/** What a command does with a spinner: clack's own result type. */
export type Spinner = ReturnType<typeof p.spinner>

/** Where the spinner writes; `process.stdout` unless a test passes its own. */
export interface SpinnerOutput {
  isTTY?: boolean
  write(text: string): unknown
}

/**
 * clack's spinner on a terminal; elsewhere, one plain line per start, stop, error or cancel
 * message (intermediate `message()` updates are left out).
 *
 * @param output - The stream the spinner writes to.
 * @returns The spinner.
 */
export function createSpinner(output: SpinnerOutput = process.stdout): Spinner {
  if (output.isTTY === true) return p.spinner()
  let cancelled = false
  const line = (text: string | undefined): void => {
    if (text) output.write(`${text}\n`)
  }
  return {
    start: (msg) => line(msg && `${msg}…`),
    stop: line,
    error: line,
    cancel: (msg) => {
      cancelled = true
      line(msg)
    },
    message: () => {},
    clear: () => {},
    get isCancelled() {
      return cancelled
    },
  }
}
