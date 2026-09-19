/**
 * Shared output styling for the public CLI surface — one visual language
 * across commands so results are scannable at a glance:
 *
 *   headings bold-cyan · package/command names cyan · metadata dim ·
 *   success green · warnings yellow
 *
 * chalk disables itself on non-TTY output and under NO_COLOR, so --json and
 * piped/CI output stay byte-clean with zero conditional code.
 */
import chalk from 'chalk'

export const ui = {
  /** Section/summary headings. */
  heading: (s: string): string => chalk.bold.cyan(s),
  /** Literal commands the user can copy. */
  cmd: (s: string): string => chalk.bold(s),
  /** Package/template identifiers. */
  id: (s: string): string => chalk.cyan(s),
  /** Secondary metadata (descriptions, hints, counts). */
  dim: (s: string): string => chalk.dim(s),
  /** Success states. */
  ok: (s: string): string => chalk.green(s),
  /** Warnings / caveats. */
  warn: (s: string): string => chalk.yellow(s),
  /** Compact `[api: payments]`-style tag. */
  badge: (stack: string, category?: string): string =>
    chalk.dim(`[${stack}${category ? `: ${category}` : ''}]`),
  /** The standard ✓/✗ line prefixes. */
  check: (s: string): string => `${chalk.green('✓')} ${s}`,
  cross: (s: string): string => `${chalk.red('✗')} ${s}`,
}
