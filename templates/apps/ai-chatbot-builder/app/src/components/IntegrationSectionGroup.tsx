import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
interface IntegrationSectionGroupProps {
  title: string
  children: ReactNode
}

export default function IntegrationSectionGroup({ title, children }: IntegrationSectionGroupProps) {
  const cm = getClassMap()
  return (
    <div style={{ marginBottom: '56px' }} data-mol-id="integration-section-group">
      <div
        className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 6))}
        style={{ gap: 'calc(4 * 0.25rem)' }}
        data-mol-id="section-header"
      >
        <h3
          className={cm.fontWeight('bold')}
          style={{
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '${textSizeToLineHeight($1)}',
            fontFamily: 'var(--font-headline, sans-serif)',
          }}
        >
          {title}
        </h3>
        <div
          className={cm.flex1}
          style={{
            height: '1px',
            backgroundColor:
              'color-mix(in srgb, var(--md-sys-color-outline-variant) 20%, transparent)',
          }}
        ></div>
      </div>
      <div
        className={cm.cn(cm.grid({ cols: 1 }), 'sm:grid-cols-2 lg:grid-cols-4')}
        style={{ gap: 'calc(6 * 0.25rem)' }}
        data-mol-id="section-grid"
      >
        {children}
      </div>
    </div>
  )
}

export { IntegrationSectionGroup }
