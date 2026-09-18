/**
 * Category tone tokens for Stillpoint.
 *
 * Each category gets a deep "fg" color (used for icon + pill text + accent
 * borders) and a soft "softBg" tint (used for icon-block backgrounds + pill
 * fills). Keeping them as inline color tokens (rather than Tailwind utility
 * classes) avoids the Tailwind static-scanner edge case where dynamically
 * built `bg-${category}` strings get pruned at build time.
 *
 * Hex values come straight from DESIGN.md "Category" colors, with each fg
 * darkened one-two shades in the same hue so pill text meets WCAG AA 4.5:1
 * on its softBg AND on white cards (axe color-contrast gate).
 */

export type CategoryTone = 'mindfulness' | 'sleep' | 'focus' | 'stress' | 'body'

export interface CategoryAccent {
  /** Foreground (icon, pill text). */
  fg: string
  /** Soft background tint (15% opacity flavor). */
  softBg: string
  /** Material-symbols glyph name. */
  icon: string
}

const ACCENTS: Record<CategoryTone, CategoryAccent> = {
  mindfulness: { fg: '#5c46c8', softBg: '#ede9f8', icon: 'self_improvement' },
  sleep: { fg: '#2f49b8', softBg: '#dde4f7', icon: 'bedtime' },
  focus: { fg: '#0369a1', softBg: '#dceffd', icon: 'visibility' },
  stress: { fg: '#0f766e', softBg: '#d2f1ec', icon: 'spa' },
  body: { fg: '#9a3412', softBg: '#fde2cf', icon: 'directions_walk' },
}

export function getCategoryAccent(category: CategoryTone): CategoryAccent {
  return ACCENTS[category] ?? ACCENTS.mindfulness
}
