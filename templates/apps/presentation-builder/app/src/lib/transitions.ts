/**
 * Per-slide enter transitions. Each slide stores a `transition` (fade / slide /
 * zoom / flip / none) set in the Editor, but the Present view never applied it —
 * slides just cut. This maps the stored value to the CSS `animation` shorthand
 * for the matching keyframes in theme.css (present-fade / -slide-in / -zoom /
 * -flip). Re-keying the slide element on the active index replays it per change.
 */

const ANIMATION: Record<string, string> = {
  fade: 'present-fade 420ms ease-out',
  slide: 'present-slide-in 420ms ease-out',
  zoom: 'present-zoom 420ms ease-out',
  flip: 'present-flip 420ms ease-out',
}

/**
 * The CSS `animation` value for a slide's transition, or undefined when the
 * transition is `none`, unset, or unknown (no animation applied).
 */
export function slideTransitionAnimation(
  transition: string | null | undefined,
): string | undefined {
  return transition ? ANIMATION[transition] : undefined
}
