/** Written by `scripts/build.mjs`: the time the compile that produced `dist/` started (ms). */
export declare const BUILD_STAMP: string
/**
 * The reason a checkout needs to build, or null if it can use its compiled CLI.
 *
 * @param root - The mlcl package root (the directory holding `bin/`).
 * @returns One line describing the missing or stale build.
 */
export declare function staleBuildWarning(root: string): string | null
