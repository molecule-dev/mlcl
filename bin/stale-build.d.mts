/** Written by `scripts/build.mjs`: the time the compile that produced `dist/` started (ms). */
export declare const BUILD_STAMP: string
/**
 * The reason a checkout needs to build, or null if it can use its compiled CLI.
 *
 * @param root - The mlcl package root (the directory holding `bin/`).
 * @returns One line describing the missing or stale build.
 */
export declare function staleBuildWarning(root: string): string | null
/** Written by `scripts/build.mjs` into the `dist/` it kept when a compile failed: that compile's inputs. */
export declare const FAILED_BUILD: string
/**
 * Everything a compile reads besides the compiler; a failed compile is retried only once one changes.
 *
 * @param root - The mlcl package root.
 * @returns The inputs, as a comparable string.
 */
export declare function buildInputs(root: string): string
/**
 * The failed compile recorded in `dist/` for the checkout's current inputs, or null.
 *
 * @param root - The mlcl package root.
 * @returns The recorded failure.
 */
export declare function lastFailedBuild(root: string): { inputs: string; status: number } | null
