/**
 * Vivace wordmark — italic, gradient-stroked text logo. Used in landing nav,
 * sidebar header, and auth-page brand header.
 *
 * Bespoke per Vivace DESIGN.md (no polished sibling — fallback cluster: dev-tools).
 */
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'

interface VivaceWordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  to?: string
}

const SIZE_CLASS: Record<NonNullable<VivaceWordmarkProps['size']>, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-5xl',
}

export function VivaceWordmark({ size = 'md', to }: VivaceWordmarkProps) {
  const cm = getClassMap()
  const wordmark = (
    <span
      className={cm.cn(
        SIZE_CLASS[size],
        'font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[var(--anim-primary)] via-[var(--anim-primary)] to-[var(--anim-secondary)]',
      )}
    >
      {APP_NAME}
    </span>
  )

  if (to) {
    return (
      <SafeLink to={to} aria-label={`${APP_NAME} home`} data-mol-id="vivace-wordmark">
        {wordmark}
      </SafeLink>
    )
  }

  return wordmark
}

export default VivaceWordmark
