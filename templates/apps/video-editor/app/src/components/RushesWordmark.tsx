/**
 * Rushes wordmark — bold italic, gradient-stroked text logo. Used in the
 * landing nav, sidebar header, and auth-page brand header.
 *
 * Bespoke per Rushes DESIGN.md (Brand Identity / Logo). Pattern source:
 * animation-tool/VivaceWordmark.tsx adapted to the cinematic violet→pink
 * Rushes palette.
 */
import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface RushesWordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  to?: string
}

const SIZE_CLASS: Record<NonNullable<RushesWordmarkProps['size']>, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-5xl',
}

export function RushesWordmark({ size = 'md', to }: RushesWordmarkProps) {
  const cm = getClassMap()
  const wordmark = (
    <span
      className={cm.cn(
        SIZE_CLASS[size],
        'font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[var(--video-link)] via-[var(--video-cta-from)] to-[var(--video-cta-to)]',
      )}
    >
      {APP_NAME}
    </span>
  )

  if (to) {
    return (
      <Link to={to} aria-label={`${APP_NAME} home`} data-mol-id="rushes-wordmark">
        {wordmark}
      </Link>
    )
  }

  return wordmark
}

export default RushesWordmark
