import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { fmtDurationMs, fmtRelative } from '../lib/format.js'
import { type HttpMethod, MethodBadge } from './MethodBadge.js'
import { statusFromCode, StatusPill } from './StatusPill.js'

/**
 * Editorial delivery-log row — terminal-aesthetic dark surface with a
 * coloured `border-l-4` keyed to the response family (2xx green / 4xx
 * amber / 5xx red), mono URL column, status pill, latency, retry
 * count, and a relative timestamp. Hover lifts -translate-y-0.5 +
 * chevron arrow.
 *
 * Translated from api-testing-tool's RequestRow — restyled with
 * webhook-specific columns (event_type, retry_count) and recoloured
 * to Pylon's response-code semantics from DESIGN.md.
 */

export interface DeliveryRowData {
  id: string
  method: HttpMethod
  url: string
  status_code: number
  status_text?: string
  duration_ms: number
  event_type?: string
  retry_count?: number
  delivered_at: string
}

interface DeliveryRowProps {
  delivery: DeliveryRowData
  /** Optional href — when provided, the row becomes a real Link. */
  to?: string
  /** When false, renders without hover/cursor styling — for landing demos. */
  interactive?: boolean
}

const ACCENT: Record<string, string> = {
  success: 'var(--mol-color-success)',
  redirect: 'var(--mol-color-info)',
  clientError: 'var(--mol-color-warning)',
  serverError: 'var(--mol-color-error)',
  pending: 'var(--mol-color-secondary)',
}

function timingTone(ms: number): string {
  if (ms < 200) return 'var(--mol-color-success)'
  if (ms < 800) return 'var(--mol-color-warning)'
  return 'var(--mol-color-error)'
}

export function DeliveryRow({ delivery, to, interactive = true }: DeliveryRowProps) {
  const cm = getClassMap()
  const family = statusFromCode(delivery.status_code)
  const accent = ACCENT[family] ?? 'var(--mol-color-text-tertiary)'
  const timing = timingTone(delivery.duration_ms)

  const inner = (
    <>
      <MethodBadge method={delivery.method} />

      <div className={cm.cn('flex-1 min-w-0')}>
        <p
          className={cm.cn('font-mono text-[13px] font-semibold truncate')}
          style={{ color: 'var(--mol-color-text)' }}
        >
          {delivery.url}
        </p>
        {delivery.event_type ? (
          <p
            className={cm.cn('mt-0.5 font-mono text-[11px] truncate')}
            style={{ color: 'var(--mol-color-text-tertiary)' }}
          >
            {delivery.event_type}
          </p>
        ) : null}
      </div>

      <div className={cm.cn('hidden md:block shrink-0')}>
        <StatusPill
          status={family}
          label={`${delivery.status_code}${delivery.status_text ? ' ' + delivery.status_text : ''}`}
        />
      </div>

      <div className={cm.cn('hidden sm:flex shrink-0 flex-col items-end w-20')}>
        <span
          className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--mol-color-text-tertiary)' }}
        >
          time
        </span>
        <span className={cm.cn('font-mono text-xs font-extrabold')} style={{ color: timing }}>
          {fmtDurationMs(delivery.duration_ms)}
        </span>
      </div>

      {delivery.retry_count != null && delivery.retry_count > 0 ? (
        <div className={cm.cn('hidden lg:flex shrink-0 flex-col items-end w-16')}>
          <span
            className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
            style={{ color: 'var(--mol-color-text-tertiary)' }}
          >
            retry
          </span>
          <span
            className={cm.cn('font-mono text-xs font-extrabold')}
            style={{ color: 'var(--mol-color-warning)' }}
          >
            ×{delivery.retry_count}
          </span>
        </div>
      ) : null}

      <div className={cm.cn('hidden xl:flex shrink-0 flex-col items-end w-20')}>
        <span
          className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--mol-color-text-tertiary)' }}
        >
          when
        </span>
        <span
          className={cm.cn('font-mono text-xs')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          {fmtRelative(delivery.delivered_at)}
        </span>
      </div>

      {interactive ? (
        <span
          className={cm.cn(
            'material-symbols-outlined text-base shrink-0 transition-all opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5',
          )}
          style={{ color: 'var(--mol-color-text-secondary)' }}
          aria-hidden="true"
        >
          arrow_forward
        </span>
      ) : null}
    </>
  )

  const className = cm.cn(
    'group relative flex items-center gap-4 rounded-xl px-4 py-3 transition-all',
    interactive && 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
  )
  const style = {
    backgroundColor: 'var(--mol-color-surface)',
    border: '1px solid var(--mol-color-border)',
    borderLeft: `4px solid ${accent}`,
  } as const

  if (to) {
    return (
      <Link to={to} className={className} style={style} data-mol-id={`delivery-row-${delivery.id}`}>
        {inner}
      </Link>
    )
  }

  return (
    <div className={className} style={style} data-mol-id={`delivery-row-${delivery.id}`}>
      {inner}
    </div>
  )
}
