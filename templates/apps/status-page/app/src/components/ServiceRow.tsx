import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ComponentStatus, StatusPill } from './StatusPill.js'
import { UptimeBar, type UptimeDay } from './UptimeBar.js'

/**
 * Service / component editorial row — name + monospaced description on
 * the left, status pill + 90-day uptime bar on the right, coloured
 * `border-l-4` accent per status, hover lift.
 *
 * Translated from ci-cd-dashboard's PipelineRow editorial treatment
 * with the trend column swapped for an `UptimeBar` (signature
 * status-page visual). The mono description echoes "monospace for
 * data" from DESIGN.md.
 */

export interface ServiceRowData {
  id: string
  name: string
  description?: string | null
  group?: string | null
  status: ComponentStatus
  uptime90Days?: UptimeDay[]
  uptimePct90?: number | null
  monitor_url?: string | null
}

const ACCENT: Record<ComponentStatus, string> = {
  operational: '#10b981',
  degraded_performance: '#f59e0b',
  partial_outage: '#f97316',
  major_outage: '#ef4444',
  under_maintenance: '#6366f1',
  unknown: '#475569',
}

interface ServiceRowProps {
  service: ServiceRowData
  /** When false, renders a non-interactive demo row (used on Landing / public). */
  linked?: boolean
  /** Hide the inline UptimeBar (e.g. for compact admin rows). */
  hideUptime?: boolean
}

export function ServiceRow({ service, linked = true, hideUptime = false }: ServiceRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = ACCENT[service.status]
  const days = service.uptime90Days ?? []
  const uptimePct = service.uptimePct90

  const body = (
    <div
      className={cm.cn(
        'group relative grid gap-4 rounded-xl px-5 py-4 transition-all',
        'grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]',
        linked && 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
      )}
      style={{
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid var(--color-border-card)',
        borderLeft: `4px solid ${accent}`,
      }}
      data-mol-id={`service-row-${service.id}`}
    >
      <div className={cm.cn('min-w-0')}>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          <p className={cm.cn('font-bold text-base text-on-surface truncate')}>{service.name}</p>
          <StatusPill status={service.status} />
        </div>
        {service.description ? (
          <p className={cm.cn('mt-1 font-mono text-xs text-on-surface-variant truncate')}>
            {service.description}
          </p>
        ) : null}
      </div>

      {!hideUptime && days.length > 0 ? (
        <div className={cm.cn('min-w-0')}>
          <UptimeBar
            days={days}
            density="compact"
            uptimeLabel={
              uptimePct != null
                ? t(
                    'serviceRow.uptimeLabel',
                    { pct: uptimePct.toFixed(2) },
                    { defaultValue: '{{pct}}% — 90d' },
                  )
                : undefined
            }
          />
        </div>
      ) : null}

      {linked ? (
        <span
          className={cm.cn(
            'material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all text-base shrink-0 absolute right-4 top-4 hidden lg:block',
          )}
          aria-hidden="true"
        >
          arrow_forward
        </span>
      ) : null}
    </div>
  )

  if (!linked) return body
  return <Link to={`/components/${service.id}`}>{body}</Link>
}
