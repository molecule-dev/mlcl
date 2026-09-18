/**
 * The avatar fill palette, in one place.
 *
 * Eleven components each declared their own `AVATAR_BG` array, and they had
 * drifted into three different palettes — so the same person could appear in a
 * different colour depending on which screen you were looking at.
 *
 * Every fill carries WHITE initials, which is what made the drift an
 * accessibility bug rather than only an inconsistency: the 500-level shades
 * those arrays used measure 2.15:1 to 4.23:1 against white, so the initials
 * were the least readable text on the contacts and conversation lists. Each
 * value below is the step of its hue where white clears the 4.5:1 WCAG AA
 * floor — 5.02, 5.48, 5.93, 7.10, 6.04 and 6.29 respectively.
 *
 * If you add a colour here, check it with `node scripts/contrast.mjs ratio
 * '#ffffff' '<hex>'` first — the initials are why this list exists.
 *
 * @module
 */

/** Avatar background fills; index with `avatar_index % AVATAR_BG.length`. */
export const AVATAR_BG = [
  '#b45309', // amber-700
  '#047857', // emerald-700
  '#0369a1', // sky-700
  '#6d28d9', // violet-700
  '#be185d', // pink-700
  '#be123c', // rose-700
] as const

/**
 * Pick a stable fill for an avatar index.
 *
 * @param index - Any integer; negatives are folded into range.
 * @returns A hex fill from {@link AVATAR_BG}.
 */
export function avatarColor(index: number): string {
  const n = Math.abs(Math.trunc(index)) % AVATAR_BG.length
  return AVATAR_BG[n]
}
