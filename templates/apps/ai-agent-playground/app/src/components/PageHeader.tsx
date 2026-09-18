// Pattern source: bespoke per Neuron DESIGN.md.
// Shared page header — title in mono, subtitle in body, optional CTA button.
import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
      <div>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('2xl'),
            'font-headline tracking-tight text-on-surface',
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 1),
              'font-body text-on-surface-variant',
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>{actions}</div>}
    </div>
  )
}

export default PageHeader
