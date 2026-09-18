import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Pennant brand mark — bold wordmark + small triangular flag glyph
 * accent in emerald. Used in the auth cards and sidebar header.
 *
 * Translated from database-admin's QuarryBrandMark wordmark anatomy +
 * api-documentation's monospace dev-tool branding, recoloured to
 * Pennant emerald per DESIGN.md.
 */

interface PennantBrandMarkProps {
  /** `lg` for auth cards, `md` for sidebar headers, `sm` for footers. */
  size?: 'sm' | 'md' | 'lg'
  /** Show a small "live" pulse next to the wordmark. */
  showPulse?: boolean
}

const SIZE_CLASS: Record<NonNullable<PennantBrandMarkProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
}

const FLAG_SIZE: Record<NonNullable<PennantBrandMarkProps['size']>, number> = {
  sm: 14,
  md: 18,
  lg: 26,
}

export function PennantBrandMark({ size = 'lg', showPulse = false }: PennantBrandMarkProps) {
  const cm = getClassMap()
  const flagPx = FLAG_SIZE[size]

  return (
    <span
      className={cm.cn(
        'inline-flex items-center gap-2 font-extrabold tracking-tight',
        SIZE_CLASS[size],
      )}
      style={{ color: 'var(--color-text)' }}
      data-mol-id="pennant-brand-mark"
      aria-label={APP_NAME}
    >
      <svg
        viewBox="0 0 24 24"
        width={flagPx}
        height={flagPx}
        aria-hidden="true"
        className={cm.cn('shrink-0')}
      >
        <path
          d="M5 3 L5 21"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M5 4 L20 8 L5 12 Z"
          fill="var(--color-primary)"
          stroke="var(--color-primary)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span>{APP_NAME}</span>
      {showPulse ? (
        <span
          className={cm.cn('ml-1 inline-block h-2 w-2 rounded-full animate-pulse')}
          style={{
            backgroundColor: 'var(--color-primary)',
            boxShadow: `0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent)`,
          }}
          aria-hidden="true"
        />
      ) : null}
    </span>
  )
}
