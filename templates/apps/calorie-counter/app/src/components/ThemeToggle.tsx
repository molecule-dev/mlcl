import { ThemeToggle as SharedThemeToggle } from '@molecule/app-ui-react'

/**
 * App chrome wrapper around the shared ThemeToggle.
 *
 * The shared default is a 30x30 icon button — fine on pointer devices but
 * under the ~40px mobile touch-target floor. `min-h/min-w` widen it to a
 * 40px tap target (min-* overrides the shared fixed w/h utilities).
 */
export function ThemeToggle() {
  return <SharedThemeToggle className="min-h-10 min-w-10" />
}
