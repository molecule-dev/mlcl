import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface SignetWordmarkProps {
  to?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP: Record<NonNullable<SignetWordmarkProps['size']>, { text: string; dot: string }> = {
  sm: { text: 'text-lg', dot: 'w-1.5 h-1.5' },
  md: { text: 'text-2xl', dot: 'w-2 h-2' },
  lg: { text: 'text-4xl', dot: 'w-2.5 h-2.5' },
}

/**
 * Signet wordmark — heavy-tracked indigo "Signet" with the gold "signet
 * dot" punctuation glyph after it. Used as the primary brand mark across
 * landing nav, sidebar header, and auth pages.
 */
export function SignetWordmark({ to, size = 'md' }: SignetWordmarkProps) {
  const cm = getClassMap()
  const sz = SIZE_MAP[size]
  const inner = (
    <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
      <span
        className={cm.cn(sz.text, 'font-extrabold tracking-tighter')}
        style={{ color: 'var(--mol-color-primary, var(--color-primary))' }}
      >
        {APP_NAME}
      </span>
      <span
        className={cm.cn(sz.dot, cm.roundedFull, 'inline-block')}
        style={{ background: 'var(--mol-color-secondary, var(--color-secondary))' }}
        aria-hidden="true"
      />
    </span>
  )
  if (to) {
    return (
      <Link to={to} className={cm.cn('inline-block')}>
        {inner}
      </Link>
    )
  }
  return inner
}
