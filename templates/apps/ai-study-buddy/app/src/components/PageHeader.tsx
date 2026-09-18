import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface PageHeaderProps {
  /** Uppercase eyebrow (e.g. "Library", "Insights"). */
  eyebrow?: string
  title: string
  subtitle?: string
  /** Right-aligned actions slot (e.g. CTAs, filters). */
  actions?: ReactNode
  /** Optional dense variant — smaller heading. */
  dense?: boolean
}

/**
 * Sticky page header used by every signed-in Koan page. Tightly tracked
 * heading, italic-serif subtitle, optional actions on the right.
 */
export function PageHeader({ eyebrow, title, subtitle, actions, dense = false }: PageHeaderProps) {
  const cm = getClassMap()
  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.sp('px', 8),
        cm.sp('py', 6),
        'sticky top-0 z-30 border-b border-outline-variant/10 bg-background/85 backdrop-blur-md',
      )}
    >
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
        {eyebrow ? (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cm.cn(
            dense ? cm.textSize('xl') : cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className={cm.cn(cm.textSize('sm'), 'serif-text italic text-on-surface-variant')}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className={cm.flex({ align: 'center', gap: 'sm' })}>{actions}</div> : null}
    </header>
  )
}

interface PageBodyProps {
  children: ReactNode
}

export function PageBody({ children }: PageBodyProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('px', 8),
        cm.sp('py', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        cm.w('full'),
        cm.flex({ direction: 'col', gap: 'lg' }),
      )}
    >
      {children}
    </div>
  )
}
