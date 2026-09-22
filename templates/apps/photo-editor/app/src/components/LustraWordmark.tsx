/**
 * Lustra wordmark — italic, gradient-stroked text logo paired with an
 * aperture-disc glyph. Used in the landing nav, sidebar header, and
 * auth-page brand header.
 *
 * Translated from animation-tool's VivaceWordmark.tsx; recoloured for
 * the violet/magenta palette in DESIGN.md and given a small "aperture"
 * mark to anchor the name as a photo-editor brand.
 */
import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface LustraWordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Wrap the wordmark in a router Link to this path. */
  to?: string
  /** Show the small aperture-disc glyph next to the wordmark. */
  showMark?: boolean
}

const SIZE_CLASS: Record<NonNullable<LustraWordmarkProps['size']>, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-5xl',
}

const MARK_SIZE: Record<NonNullable<LustraWordmarkProps['size']>, string> = {
  sm: 'w-6 h-6 text-[16px]',
  md: 'w-8 h-8 text-[20px]',
  lg: 'w-10 h-10 text-[24px]',
  xl: 'w-14 h-14 text-[32px]',
}

export function LustraWordmark({ size = 'md', to, showMark = true }: LustraWordmarkProps) {
  const cm = getClassMap()

  const inner = (
    <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
      {showMark && (
        <span
          aria-hidden="true"
          className={cm.cn(
            MARK_SIZE[size],
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full bg-gradient-to-br from-[var(--photo-accent)] via-[var(--photo-panel-text-highlight)] to-[var(--photo-danger)] text-white shadow-md overflow-hidden',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            aria-hidden="true"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            image
          </span>
        </span>
      )}
      <span
        className={cm.cn(
          SIZE_CLASS[size],
          'font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[var(--photo-panel-text-highlight)] via-[var(--photo-accent)] to-[var(--photo-danger)]',
        )}
      >
        {APP_NAME}
      </span>
    </span>
  )

  if (to) {
    return (
      <Link to={to} aria-label={`${APP_NAME} home`} data-mol-id="lustra-wordmark">
        {inner}
      </Link>
    )
  }

  return inner
}

export default LustraWordmark
