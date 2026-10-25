/**
 * The exit status `mlcl inject` uses when its DDL-compatibility preflight
 * refuses the SQL the run would write, and the create-side recognition of it.
 *
 * `create` runs the injector as a CHILD PROCESS (Step 10), so the refusal has
 * to cross a process boundary. A dedicated status is that signal: the parent
 * decides from the child's `exitCode`, never from its prose, and every OTHER
 * inject failure — an unavailable package source under `--skip-install`, a
 * smoke test, a missing package — keeps its existing warn-and-continue
 * treatment. Without the distinction, `create` reported success over a project
 * whose API would never boot: `server.ts` awaits `runMigrations()`, and the
 * refusals were printed by a killed child and then swallowed (r7 acceptance
 * review, N1/c3).
 *
 * 78 is EX_CONFIG from `sysexits.h`: the input is well-formed but cannot be
 * configured as asked. Nothing else in the CLI uses it.
 *
 * @module
 */

/**
 * The exit status `mlcl inject` uses for a DDL-compatibility refusal.
 *
 * A distinct status (never a parsed message) is how `create` tells a refusal
 * that must fail the scaffold from the errors a `--skip-install` scaffold is
 * allowed to warn about and continue.
 */
export const DDL_INCOMPATIBLE_EXIT = 78

/**
 * Whether `error` is an inject run that refused DDL compatibility.
 *
 * execa puts the child's status on `exitCode`. A plain object with the same
 * field is accepted too, so this is testable without spawning.
 *
 * @param error - The thrown value (an execa error, or a stand-in).
 * @returns True when the child exited with {@link DDL_INCOMPATIBLE_EXIT}.
 */
export function isDdlCompatibilityFailure(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { exitCode?: unknown }).exitCode === DDL_INCOMPATIBLE_EXIT
  )
}
