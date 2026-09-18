import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtCount, fmtRelative } from '../lib/format.js'
import { DeliverySparkline } from './DeliverySparkline.js'
import { type DeliveryStatus, StatusPill } from './StatusPill.js'

/**
 * Endpoint summary card — left-accent border keyed to live/paused
 * /failing status, mono URL with method-prefix dot, success-rate
 * sparkline (24h), counts (deliveries/failures), event subscriptions
 * preview, last-delivery relative timestamp.
 *
 * Designed for the Endpoints list and Dashboard "Top endpoints"
 * stripe. Shape mirrors DESIGN.md "Endpoint Card" rules: 8px radius,
 * 1px outline (no shadow), 3px-equivalent left accent, mono URL.
 *
 * Adapted from log-viewer's ServiceCard treatment + status-page's
 * ServiceRow accent pattern; recoloured to Pylon's emerald/amber/red
 * delivery semantics.
 */

export interface EndpointCardData {
  id: string
  url: string
  description?: string
  status: DeliveryStatus
  success_rate_24h: number
  deliveries_24h: number
  failures_24h: number
  events: readonly string[]
  last_delivered_at?: string
  sparkline?: readonly number[]
}

interface EndpointCardProps {
  endpoint: EndpointCardData
  /** Optional override; default links to /endpoints/:id. */
  to?: string
  /** Disable hover interactions for landing-page demos. */
  interactive?: boolean
}

const STATUS_ACCENT: Record<DeliveryStatus, string> = {
  delivered: 'var(--mol-color-success)',
  failed: 'var(--mol-color-error)',
  retrying: 'var(--mol-color-warning)',
  pending: 'var(--mol-color-secondary)',
  disabled: 'var(--mol-color-text-tertiary)',
  success: 'var(--mol-color-success)',
  redirect: 'var(--mol-color-info)',
  clientError: 'var(--mol-color-warning)',
  serverError: 'var(--mol-color-error)',
  timeout: 'var(--mol-color-secondary)',
  live: 'var(--mol-color-success)',
  paused: 'var(--mol-color-text-tertiary)',
}

export function EndpointCard({ endpoint, to, interactive = true }: EndpointCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = STATUS_ACCENT[endpoint.status] ?? 'var(--mol-color-success)'
  const sparkStroke =
    endpoint.success_rate_24h >= 0.99
      ? 'var(--mol-color-success)'
      : endpoint.success_rate_24h >= 0.95
        ? 'var(--mol-color-warning)'
        : 'var(--mol-color-error)'
  const ratePct = Math.round(endpoint.success_rate_24h * 1000) / 10

  const inner = (
    <>
      <div className={cm.cn('flex items-start justify-between gap-4 flex-wrap')}>
        <div className={cm.cn('min-w-0 flex-1')}>
          <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
            <StatusPill status={endpoint.status} />
            {endpoint.description ? (
              <span
                className={cm.cn('text-[11px] font-medium')}
                style={{ color: 'var(--mol-color-text-secondary)' }}
              >
                {endpoint.description}
              </span>
            ) : null}
          </div>
          <p
            className={cm.cn('mt-2 font-mono text-sm font-semibold truncate')}
            style={{ color: 'var(--mol-color-text)' }}
            title={endpoint.url}
          >
            {endpoint.url}
          </p>
          <div
            className={cm.cn('mt-2 flex items-center gap-3 flex-wrap font-mono text-[11px]')}
            style={{ color: 'var(--mol-color-text-tertiary)' }}
          >
            <span className={cm.cn('inline-flex items-center gap-1')}>
              <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                schedule
              </span>
              {endpoint.last_delivered_at
                ? fmtRelative(endpoint.last_delivered_at)
                : t('endpointCard.never', {}, { defaultValue: 'no deliveries yet' })}
            </span>
            {endpoint.events.length > 0 ? (
              <span className={cm.cn('inline-flex items-center gap-1')}>
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  bolt
                </span>
                {t(
                  'endpointCard.eventsCount',
                  { count: endpoint.events.length },
                  { defaultValue: '{{count}} events' },
                )}
              </span>
            ) : null}
          </div>
        </div>

        <div className={cm.cn('flex items-end gap-4 shrink-0')}>
          <div className={cm.cn('flex flex-col items-end')}>
            <span
              className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
              style={{ color: 'var(--mol-color-text-tertiary)' }}
            >
              {t('endpointCard.successRate', {}, { defaultValue: 'Success 24h' })}
            </span>
            <span
              className={cm.cn('font-mono text-lg font-extrabold tracking-tighter')}
              style={{ color: sparkStroke }}
            >
              {ratePct}%
            </span>
          </div>
          {endpoint.sparkline && endpoint.sparkline.length > 1 ? (
            <DeliverySparkline
              values={endpoint.sparkline}
              width={88}
              height={32}
              stroke={sparkStroke}
              ariaLabel={`Success rate trend for ${endpoint.url}`}
            />
          ) : null}
        </div>
      </div>

      <div
        className={cm.cn(
          'mt-3 pt-3 flex items-center justify-between gap-2 flex-wrap font-mono text-[11px]',
        )}
        style={{
          borderTop: '1px solid var(--mol-color-border)',
          color: 'var(--mol-color-text-secondary)',
        }}
      >
        <span>
          <span style={{ color: 'var(--mol-color-success)' }}>
            {fmtCount(endpoint.deliveries_24h)}
          </span>{' '}
          {t('endpointCard.delivered', {}, { defaultValue: 'delivered' })}
          {endpoint.failures_24h > 0 ? (
            <>
              {' · '}
              <span style={{ color: 'var(--mol-color-error)' }}>
                {fmtCount(endpoint.failures_24h)}
              </span>{' '}
              {t('endpointCard.failed', {}, { defaultValue: 'failed' })}
            </>
          ) : null}
        </span>
        {interactive ? (
          <span
            className={cm.cn(
              'inline-flex items-center gap-1 transition-all opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5',
            )}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {t('common.open', {}, { defaultValue: 'Open' })}
            <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
              arrow_forward
            </span>
          </span>
        ) : null}
      </div>
    </>
  )

  const className = cm.cn(
    'group relative block rounded-xl px-5 py-4 transition-all',
    interactive && 'hover:-translate-y-0.5 hover:shadow-lg',
  )
  const style = {
    backgroundColor: 'var(--mol-color-surface)',
    border: '1px solid var(--mol-color-border)',
    borderLeft: `4px solid ${accent}`,
  } as const

  const href = to ?? `/endpoints/${endpoint.id}`
  return (
    <Link
      to={href}
      className={className}
      style={style}
      data-mol-id={`endpoint-card-${endpoint.id}`}
    >
      {inner}
    </Link>
  )
}
