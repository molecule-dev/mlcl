import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface PageHeadingProps {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
}

/**
 * Editorial page heading — uppercase eyebrow + tracking-tight 3xl
 * title + muted subtitle + right-aligned action slot.
 *
 * Translated from personal-finance's dashboard heading anatomy
 * (eyebrow + extrabold + lead) so every Rendition page opens with the
 * same editorial rhythm.
 */
export function PageHeading({ eyebrow, title, subtitle, actions }: PageHeadingProps) {
  const cm = getClassMap()
  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'start', justify: 'between', wrap: 'wrap', gap: 'md' }),
        cm.sp('mb', 6),
      )}
    >
      <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
        {eyebrow && (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-background')}
        >
          {title}
        </h1>
        {subtitle && (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className={cm.flex({ align: 'center', gap: 'sm' })}>{actions}</div>}
    </header>
  )
}
