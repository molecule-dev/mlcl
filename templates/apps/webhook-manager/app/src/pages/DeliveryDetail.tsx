import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { MethodBadge } from '../components/MethodBadge.js'
import { PayloadViewer } from '../components/PayloadViewer.js'
import { statusFromCode, StatusPill } from '../components/StatusPill.js'
import { useApi } from '../lib/useApi.js'

const PANEL_BG = 'var(--mol-color-surface)'
const PANEL_BORDER = 'var(--mol-color-border)'

interface ApiDelivery {
  id: string
  webhook_id: string
  event_id: string | null
  event_type: string
  method: string
  url: string
  request_headers: unknown
  request_body: string
  response_headers: unknown
  response_body: string
  status: string
  status_code: number
  status_text: string
  duration_ms: number
  retry_count: number
  delivered_at: string | null
  created_at: string
}

const safeParse = (s: string): unknown => {
  try {
    return JSON.parse(s)
  } catch (_error) {
    // not valid JSON — return raw string as fallback
    return s
  }
}

const parseObj = (v: unknown): Record<string, unknown> => {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  if (typeof v === 'string') {
    const parsed = safeParse(v)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  }
  return {}
}

export function DeliveryDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [replaying, setReplaying] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: delivery, loading, error } = useApi<ApiDelivery>(id ? `/deliveries/${id}` : null)

  const replay = async () => {
    if (!id) return
    setReplaying(true)
    setActionError(null)
    try {
      const client = getHttpClient()
      const res = await client.post<{ id: string }>(`/deliveries/${id}/replay`)
      const newId = res.data?.id
      if (newId) navigate(`/deliveries/${newId}`)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Replay failed')
    } finally {
      setReplaying(false)
    }
  }

  if (loading) {
    return (
      <div
        className={cm.cn(cm.sp('p', 6), 'max-w-7xl mx-auto')}
        style={{ color: 'var(--mol-color-text-secondary)' }}
      >
        <p className={cm.cn('font-mono text-sm')}>
          {t('deliveryDetail.loading', {}, { defaultValue: 'Loading delivery…' })}
        </p>
      </div>
    )
  }

  if (error || !delivery) {
    return (
      <div
        className={cm.cn(cm.sp('p', 6), 'max-w-3xl mx-auto')}
        style={{ color: 'var(--mol-color-error)' }}
      >
        <p className={cm.cn('font-mono text-sm')}>
          {t('deliveryDetail.notFound', {}, { defaultValue: 'Delivery not found.' })}
        </p>
        <Link to="/deliveries" className={cm.cn('mt-2 inline-block underline')}>
          {t('deliveryDetail.backLink', {}, { defaultValue: '← Back to deliveries' })}
        </Link>
      </div>
    )
  }

  const family = statusFromCode(delivery.status_code || 0)
  const requestHeaders = parseObj(delivery.request_headers)
  const responseHeaders = parseObj(delivery.response_headers)
  const requestBody = safeParse(delivery.request_body) as Record<string, unknown>
  const responseBody = safeParse(delivery.response_body) as Record<string, unknown>

  return (
    <div
      className={cm.cn(cm.sp('p', 6), 'max-w-7xl mx-auto')}
      style={{ color: 'var(--mol-color-text)' }}
    >
      <div
        className={cm.cn('mb-2 flex items-center gap-2 text-xs font-mono')}
        style={{ color: 'var(--mol-color-text-tertiary)' }}
      >
        <Link to="/deliveries" className={cm.cn('hover:underline')}>
          {t('deliveryDetail.crumb', {}, { defaultValue: 'deliveries' })}
        </Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: 'var(--mol-color-text-secondary)' }}>{delivery.id.slice(0, 8)}</span>
      </div>

      <div className={cm.cn('flex items-end justify-between gap-4 flex-wrap mb-6')}>
        <div className={cm.cn('min-w-0 flex-1')}>
          <div className={cm.cn('flex items-center gap-2 flex-wrap mb-2')}>
            <MethodBadge method={(delivery.method as 'POST') ?? 'POST'} density="default" />
            <StatusPill
              status={family}
              label={`${delivery.status_code || 0} ${delivery.status_text || delivery.status}`}
              emphasis
            />
            <span
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
              style={{ color: 'var(--mol-color-text-secondary)' }}
            >
              {t(
                'deliveryDetail.eyebrow',
                { n: (delivery.retry_count ?? 0) + 1 },
                { defaultValue: 'delivery · attempt {{n}}' },
              )}
            </span>
          </div>
          <h1
            className={cm.cn(
              'font-mono text-2xl md:text-3xl font-extrabold tracking-tight truncate',
            )}
            style={{ color: 'var(--mol-color-text)' }}
            title={delivery.url}
          >
            {delivery.url}
          </h1>
          <p
            className={cm.cn('mt-1 text-sm font-mono')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {delivery.event_type} · {(delivery.duration_ms / 1000).toFixed(2)}s ·{' '}
            {new Date(delivery.delivered_at ?? delivery.created_at).toLocaleString()}
          </p>
        </div>
        <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
          <Link
            to={`/endpoints/${delivery.webhook_id}`}
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono font-semibold text-sm transition-colors',
            )}
            style={{
              border: '1px solid var(--mol-color-border)',
              color: 'var(--mol-color-text)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              cloud_sync
            </span>
            {t('deliveryDetail.viewEndpoint', {}, { defaultValue: 'View endpoint' })}
          </Link>
          <button
            type="button"
            onClick={replay}
            disabled={replaying}
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono font-semibold text-sm transition-all hover:opacity-90 shadow-lg disabled:opacity-50',
            )}
            style={{
              backgroundColor: BRAND_COLOR,
              color: 'var(--color-on-primary)',
              boxShadow:
                '0 8px 24px -8px color-mix(in srgb, var(--mol-color-primary) 40%, transparent)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              autorenew
            </span>
            {replaying
              ? t('deliveryDetail.replaying', {}, { defaultValue: 'Replaying…' })
              : t('deliveryDetail.replay', {}, { defaultValue: 'Replay now' })}
          </button>
        </div>
      </div>

      {actionError && (
        <p
          className={cm.cn('mb-4 text-xs font-mono')}
          style={{ color: 'var(--mol-color-error)' }}
          role="alert"
        >
          {actionError}
        </p>
      )}

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <section className={cm.cn('lg:col-span-7 flex flex-col gap-6')}>
          <div className={cm.cn('flex flex-col gap-3')}>
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('deliveryDetail.requestHeaders', {}, { defaultValue: 'Request headers' })}
            </h2>
            <PayloadViewer value={requestHeaders} eyebrow="// request headers" />
          </div>

          <div className={cm.cn('flex flex-col gap-3')}>
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('deliveryDetail.requestBody', {}, { defaultValue: 'Request body' })}
            </h2>
            <PayloadViewer
              value={requestBody}
              eyebrow="// request body"
              contentType="application/json"
            />
          </div>

          <div className={cm.cn('flex flex-col gap-3')}>
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('deliveryDetail.responseHeaders', {}, { defaultValue: 'Response headers' })}
            </h2>
            <PayloadViewer value={responseHeaders} eyebrow="// response headers" />
          </div>

          <div className={cm.cn('flex flex-col gap-3')}>
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('deliveryDetail.responseBody', {}, { defaultValue: 'Response body' })}
            </h2>
            <PayloadViewer
              value={responseBody}
              eyebrow="// response body"
              contentType="application/json"
            />
          </div>
        </section>

        <aside className={cm.cn('lg:col-span-5 flex flex-col gap-6')}>
          <div
            className={cm.cn('rounded-xl p-5')}
            style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
          >
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight mb-3')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('deliveryDetail.metaTitle', {}, { defaultValue: 'Delivery metadata' })}
            </h2>
            <dl className={cm.cn('grid grid-cols-1 gap-y-2 font-mono text-xs')}>
              {[
                ['delivery id', delivery.id],
                ['endpoint id', delivery.webhook_id],
                ['event id', delivery.event_id ?? '—'],
                ['event type', delivery.event_type],
                ['status', `${delivery.status_code} (${delivery.status})`],
                ['duration', `${delivery.duration_ms}ms`],
                ['retry count', String(delivery.retry_count)],
                ['delivered at', delivery.delivered_at ?? '—'],
                ['created at', delivery.created_at],
              ].map(([k, v]) => (
                <div key={k} className={cm.cn('flex items-baseline justify-between gap-3')}>
                  <dt
                    className={cm.cn('text-[10px] font-black uppercase tracking-widest')}
                    style={{ color: 'var(--mol-color-text-tertiary)' }}
                  >
                    {k}
                  </dt>
                  <dd className={cm.cn('truncate')} style={{ color: 'var(--mol-color-text)' }}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  )
}
