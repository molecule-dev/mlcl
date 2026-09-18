import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
interface KpiCardProps {
  label: string
  value: string
  indicator: ReactNode
}

export default function KpiCard({ label, value, indicator }: KpiCardProps) {
  const cm = getClassMap()

  return (
    <div
      data-mol-id="kpi-card"
      className={cm.flex({ direction: 'col' })}
      style={{
        backgroundColor: 'var(--color-on-error)',
        padding: 'calc(6 * 0.25rem)',
        borderRadius: '0.75rem',
        borderColor: 'var(--md-sys-color-primary)',
        boxShadow: 'var(--tw-shadow-sm, revert)',
        gap: 'calc(2 * 0.25rem)',
      }}
    >
      <span
        className={cm.fontWeight('bold')}
        style={{
          fontSize: '${textSizeToRem($1)}',
          lineHeight: '${textSizeToLineHeight($1)}',
          textTransform: 'uppercase',
          letterSpacing: "${1 === 'wider' ? '0.05em' : '0.025em'}",
          color: 'var(--md-sys-color-on-surface-variant)',
        }}
      >
        {label}
      </span>
      <div className={cm.flex({ align: 'baseline' })} style={{ gap: 'calc(2 * 0.25rem)' }}>
        <span
          className={cm.fontWeight('bold')}
          style={{ fontSize: '${textSizeToRem($1)}', lineHeight: '${textSizeToLineHeight($1)}' }}
        >
          {value}
        </span>
        {indicator}
      </div>
    </div>
  )
}

export { KpiCard }
