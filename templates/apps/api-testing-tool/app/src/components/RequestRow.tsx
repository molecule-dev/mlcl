import { getClassMap } from '@molecule/app-ui'

import { fmtDurationMs, fmtRelative } from '../lib/format.js'
import { type HttpMethod, MethodBadge } from './MethodBadge.js'
import { statusFromCode, StatusPill } from './StatusPill.js'

/**
 * Editorial request-history row — terminal-aesthetic dark surface with a
 * coloured `border-l-4` keyed to the response family (2xx green / 4xx
 * amber / 5xx red), mono URL column, status pill, latency, size, and a
 * relative timestamp. Hover lifts -translate-y-0.5 + chevron arrow.
 *
 * Translated from ci-cd-dashboard's PipelineRow (status accent stripe +
 * mono columns + hover lift) and recoloured to Pylon's
 * response-code semantics.
 */

export interface RequestRowData {
  id: string
  method: HttpMethod
  url: string
  status_code: number
  status_text?: string
  duration_ms: number
  size_bytes?: number
  collection?: string
  ran_at: string
}

interface RequestRowProps {
  request: RequestRowData
  /** When false, renders without hover/cursor styling — for landing-page demos. */
  interactive?: boolean
}

const ACCENT: Record<string, string> = {
  success: 'var(--color-status-2xx)',
  redirect: 'var(--color-status-3xx)',
  clientError: 'var(--color-status-4xx)',
  serverError: 'var(--color-status-5xx)',
  pending: 'var(--color-info)',
}

function timingTone(ms: number): { color: string; label: string } {
  if (ms < 200) return { color: 'var(--color-success)', label: 'fast' }
  if (ms < 500) return { color: 'var(--color-warning)', label: 'normal' }
  return { color: 'var(--color-error)', label: 'slow' }
}

export function RequestRow({ request, interactive = true }: RequestRowProps) {
  const cm = getClassMap()
  const family = statusFromCode(request.status_code)
  const accent = ACCENT[family] ?? 'var(--color-text-muted)'
  const timing = timingTone(request.duration_ms)

  return (
    <div
      className={cm.cn(
        'group relative flex items-center gap-4 rounded-xl px-4 py-3 transition-all',
        interactive && 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
      )}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-surface-elevated) 60%, transparent)',
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${accent}`,
      }}
      data-mol-id={`request-row-${request.id}`}
    >
      <MethodBadge method={request.method} />

      <div className={cm.cn('flex-1 min-w-0')}>
        <p
          className={cm.cn('font-mono text-[13px] font-semibold truncate')}
          style={{ color: 'var(--color-text-primary)' }}
        >
          {request.url}
        </p>
        {request.collection ? (
          <p
            className={cm.cn('mt-0.5 font-mono text-[11px] truncate')}
            style={{ color: 'var(--color-text-muted)' }}
          >
            {request.collection}
          </p>
        ) : null}
      </div>

      <div className={cm.cn('hidden md:block shrink-0')}>
        <StatusPill
          status={family}
          label={`${request.status_code}${request.status_text ? ' ' + request.status_text : ''}`}
        />
      </div>

      <div className={cm.cn('hidden sm:flex shrink-0 flex-col items-end w-20')}>
        <span
          className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--color-text-muted)' }}
        >
          time
        </span>
        <span className={cm.cn('font-mono text-xs font-extrabold')} style={{ color: timing.color }}>
          {fmtDurationMs(request.duration_ms)}
        </span>
      </div>

      {request.size_bytes != null ? (
        <div className={cm.cn('hidden lg:flex shrink-0 flex-col items-end w-16')}>
          <span
            className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
            style={{ color: 'var(--color-text-muted)' }}
          >
            size
          </span>
          <span className={cm.cn('font-mono text-xs')} style={{ color: 'var(--color-text)' }}>
            {request.size_bytes < 1024
              ? `${request.size_bytes} B`
              : `${(request.size_bytes / 1024).toFixed(1)} KB`}
          </span>
        </div>
      ) : null}

      <div className={cm.cn('hidden xl:flex shrink-0 flex-col items-end w-20')}>
        <span
          className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--color-text-muted)' }}
        >
          when
        </span>
        <span
          className={cm.cn('font-mono text-xs')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {fmtRelative(request.ran_at)}
        </span>
      </div>

      {interactive ? (
        <span
          className={cm.cn(
            'material-symbols-outlined text-base shrink-0 transition-all opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5',
          )}
          style={{ color: 'var(--color-text-secondary)' }}
          aria-hidden="true"
        >
          arrow_forward
        </span>
      ) : null}
    </div>
  )
}
