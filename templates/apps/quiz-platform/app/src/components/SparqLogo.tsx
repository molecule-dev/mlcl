/**
 * Sparq wordmark — typographic logo with the signature "q" rendered in
 * the accent gold to evoke a lightning-bolt spark. Used in branded auth pages,
 * marketing chrome, and inline on landing/footer.
 *
 * Translated from lms/LoginBranding.tsx (rounded-square mark + heading
 * pair). The mark slot here renders an inline SVG spark instead of a
 * material icon so the brand stays distinctive.
 */
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export type SparqLogoProps = {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'onSurface' | 'onPrimary'
}

const SIZE_TO_TEXT = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-[2rem]',
} as const

const SIZE_TO_MARK = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
} as const

export function SparqLogo({ size = 'md', variant = 'onSurface' }: SparqLogoProps) {
  const cm = getClassMap()
  const onPrimary = variant === 'onPrimary'

  return (
    <span className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
      <span
        className={cm.cn(
          SIZE_TO_MARK[size],
          cm.flex({ align: 'center', justify: 'center' }),
          onPrimary
            ? 'bg-surface/20 backdrop-blur-md border border-surface/30'
            : 'bg-gradient-to-br from-primary to-tertiary shadow-lg shadow-primary/30',
          'rounded-2xl rotate-[-6deg]',
        )}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cm.cn('w-1/2 h-1/2 rotate-[6deg]')}
        >
          <path
            d="M13 2 L4 14 L11 14 L9 22 L20 9 L13 9 Z"
            fill="var(--quiz-logo-bolt)"
            stroke="var(--quiz-logo-bolt-stroke)"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          SIZE_TO_TEXT[size],
          'tracking-tight',
          onPrimary ? 'text-white' : 'text-on-surface',
        )}
      >
        {APP_NAME.slice(0, -1)}
        <span className={cm.cn('text-warning')}>{APP_NAME.slice(-1)}</span>
      </span>
    </span>
  )
}

export default SparqLogo
