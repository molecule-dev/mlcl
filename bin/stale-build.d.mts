/** Written by `scripts/build.mjs`: the time the compile that produced `dist/` started (ms). */
export declare const BUILD_STAMP: string
/**
 * The warning to print when a source file changed after `dist/` was built, else null.
 *
 * @param root - The mlcl package root (the directory holding `bin/`).
 * @returns One line naming the newest changed file and the rebuild command.
 */
export declare function staleBuildWarning(root: string): string | null
