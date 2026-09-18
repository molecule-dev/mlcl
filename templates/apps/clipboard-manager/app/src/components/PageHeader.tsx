import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface PageHeaderProps {
  /** Small uppercase eyebrow line above the heading. Optional. */
  eyebrow?: string
  /** Main page heading. */
  heading: string
  /** Description rendered under the heading. Optional. */
  description?: string
  /** Slot rendered to the right (action buttons). Optional. */
  actions?: ReactNode
}

/**
 * Standard signed-in page header — periwinkle eyebrow line, large
 * heading, muted description, optional right-aligned actions.
 */
export function PageHeader({ eyebrow, heading, description, actions }: PageHeaderProps) {
  const cm = getClassMap()
  return (
    <header
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'md' }),
        cm.sp('mb', 6),
        'md:flex-row md:items-end md:justify-between',
      )}
    >
      <div>
        {eyebrow && (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'uppercase tracking-widest text-primary font-mono',
            )}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {heading}
        </h1>
        {description && (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 1),
              'text-on-surface-variant max-w-2xl',
            )}
          >
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-shrink-0')}>
          {actions}
        </div>
      )}
    </header>
  )
}

export default PageHeader
