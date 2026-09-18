/**
 * 90-day uptime bar — segmented green ladder, one square per day,
 * incident days dim/amber/red per their worst impact for the day,
 * with axis labels in mono. Hover emits a tooltip via the `title`
 * attribute (no JS).
 *
 * Translated from personal-finance's NetWorthCard sparkline shape
 * (status-page-specific: discrete day buckets instead of an area
 * trend, brand-emerald + status-amber/red for incident days).
 */

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type UptimeDayStatus =
  'operational' | 'degraded' | 'partial' | 'major' | 'maintenance' | 'unknown' | 'empty'

export interface UptimeDay {
  date: string
  status: UptimeDayStatus
  uptimePct?: number
  incidentCount?: number
}

const SEGMENT_COLOR: Record<UptimeDayStatus, string> = {
  operational: '#10b981',
  degraded: '#f59e0b',
  partial: '#f97316',
  major: '#ef4444',
  maintenance: '#6366f1',
  unknown: '#475569',
  empty: '#1e293b',
}

interface UptimeBarProps {
  days: UptimeDay[]
  /** `compact` (3px segments, 90-day) vs `detailed` (6px segments, 30-day). */
  density?: 'compact' | 'detailed'
  /** Average uptime label e.g. "99.97 % uptime — 90 days". */
  uptimeLabel?: string
  /** Date range eyebrow e.g. "Apr 27 – Jul 26". */
  rangeLabel?: string
  /** Total incident count e.g. "3 incidents". */
  incidentLabel?: string
}

export function UptimeBar({
  days,
  density = 'compact',
  uptimeLabel,
  rangeLabel,
  incidentLabel,
}: UptimeBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const segWidth = density === 'compact' ? 3 : 6
  const segGap = 2
  const segHeight = 34

  // One label for the whole ladder. Each segment used to carry its own
  // `aria-label`, which axe flags as `aria-prohibited-attr` (serious): a bare
  // `span` has no role, and aria-label is only permitted on elements that do.
  // It was also unusable — a 90-day bar announced 90 separate labels per
  // service, 2340 nodes on the landing page. The bar is one graphic, so it
  // gets one `role="img"` + summary here and the segments go decorative.
  const summary =
    [uptimeLabel, rangeLabel, incidentLabel].filter(Boolean).join(' · ') ||
    t('uptimeBar.label', { days: days.length }, { defaultValue: `${days.length}-day uptime` })

  return (
    <div data-mol-id="uptime-bar" className={cm.cn('w-full')}>
      {uptimeLabel || incidentLabel ? (
        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
          {incidentLabel ? (
            <span
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {incidentLabel}
            </span>
          ) : (
            <span />
          )}
          {uptimeLabel ? (
            <span className={cm.cn('font-mono text-sm font-extrabold text-on-surface')}>
              {uptimeLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={cm.cn('mt-2 flex items-end overflow-hidden')}
        style={{ height: segHeight, gap: segGap }}
        role="img"
        aria-label={summary}
      >
        {days.map((d, i) => {
          const color = SEGMENT_COLOR[d.status]
          const title = `${d.date} · ${d.uptimePct != null ? d.uptimePct.toFixed(2) + '% uptime' : d.status}${d.incidentCount ? ` · ${d.incidentCount} incident${d.incidentCount === 1 ? '' : 's'}` : ''}`
          return (
            <span
              key={`${d.date}-${i}`}
              className={cm.cn('block rounded-sm transition-transform hover:-translate-y-0.5')}
              style={{
                width: segWidth,
                height: segHeight,
                backgroundColor: color,
                opacity: d.status === 'empty' ? 0.5 : 1,
              }}
              title={title}
              aria-hidden="true"
            />
          )
        })}
      </div>

      {rangeLabel ? (
        <p
          className={cm.cn(
            'mt-1.5 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {rangeLabel}
        </p>
      ) : null}
    </div>
  )
}
