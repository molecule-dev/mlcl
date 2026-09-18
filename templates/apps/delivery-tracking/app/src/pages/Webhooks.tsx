import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  active: boolean
  created_at: string
  last_delivery: string | null
}

interface WebhookEvent {
  id: string
  endpoint_id: string
  event_type: string
  payload_preview: string
  status: 'success' | 'failed' | 'pending'
  http_status: number | null
  delivered_at: string
  retry_count: number
}

const STATUS_COLOR: Record<WebhookEvent['status'], string> = {
  success: 'bg-success-container text-on-success-container',
  failed: 'bg-error-container text-on-error-container',
  pending: 'bg-warning-container text-on-warning-container',
}

const EVENT_OPTIONS = [
  { value: 'shipment.created', defaultLabel: 'Shipment created' },
  { value: 'shipment.updated', defaultLabel: 'Shipment updated' },
  { value: 'shipment.in_transit', defaultLabel: 'Shipment in transit' },
  { value: 'shipment.out_for_delivery', defaultLabel: 'Shipment out for delivery' },
  { value: 'shipment.delivered', defaultLabel: 'Shipment delivered' },
  { value: 'shipment.exception', defaultLabel: 'Shipment exception' },
] as const

export function Webhooks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([])
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [draft, setDraft] = useState<{ url: string; events: Set<string> }>({
    url: '',
    events: new Set(['shipment.delivered', 'shipment.exception']),
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)

  function refreshAll() {
    return Promise.all([
      http.get('/api/webhooks').then((res) => setEndpoints(unwrapList<WebhookEndpoint>(res))),
      http.get('/api/webhook-events').then((res) => setEvents(unwrapList<WebhookEvent>(res))),
    ])
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    refreshAll()
      .catch(() => {
        if (!cancelled)
          setError(t('webhooks.loadError', {}, { defaultValue: 'Failed to load webhooks.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, t])

  function toggleEvent(value: string) {
    setDraft((d) => {
      const next = new Set(d.events)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return { ...d, events: next }
    })
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!/^https?:\/\//i.test(draft.url.trim())) {
      setSubmitError(
        t(
          'webhooks.urlError',
          {},
          { defaultValue: 'Endpoint URL must start with http:// or https://' },
        ),
      )
      return
    }
    if (draft.events.size === 0) {
      setSubmitError(
        t('webhooks.eventsError', {}, { defaultValue: 'Select at least one event to subscribe.' }),
      )
      return
    }
    setSubmitting(true)
    try {
      const res = await http.post<{ secret?: string }>('/api/webhooks', {
        url: draft.url.trim(),
        events: [...draft.events],
      })
      const data = (res?.data ?? {}) as { secret?: string }
      setCreatedSecret(data.secret ?? null)
      setDraft({ url: '', events: new Set(['shipment.delivered', 'shipment.exception']) })
      setCreatorOpen(false)
      await refreshAll()
    } catch (err) {
      setSubmitError(
        (err as Error)?.message ??
          t('webhooks.createFailed', {}, { defaultValue: 'Could not create webhook endpoint.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const visibleEvents = useMemo(
    () => (selectedEndpoint ? events.filter((e) => e.endpoint_id === selectedEndpoint) : events),
    [events, selectedEndpoint],
  )

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('webhooks.heading', {}, { defaultValue: 'Webhooks' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'webhooks.subheading',
              { count: endpoints.length },
              { defaultValue: '{{count}} endpoints configured' },
            )}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="button-new-endpoint"
          onClick={() => {
            setCreatorOpen(true)
            setCreatedSecret(null)
          }}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          + {t('webhooks.newLabel', {}, { defaultValue: 'New endpoint' })}
        </button>
      </header>

      {creatorOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          data-mol-id="dialog-new-endpoint"
          className={cm.cn(cm.overlay, cm.flex({ align: 'center', justify: 'center' }), 'z-50')}
        >
          <form
            onSubmit={submitNew}
            className={cm.cn(cm.card(), cm.sp('p', 6), cm.maxW('lg'), 'w-full space-y-4')}
          >
            <header>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('webhooks.newDialog.heading', {}, { defaultValue: 'New webhook endpoint' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                {t(
                  'webhooks.newDialog.subheading',
                  {},
                  {
                    defaultValue:
                      'We sign every delivery with HMAC-SHA256. Secret will be shown once.',
                  },
                )}
              </p>
            </header>
            <label className={cm.cn('block')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant uppercase tracking-wider',
                  cm.sp('mb', 1),
                  'block',
                )}
              >
                {t('webhooks.newDialog.urlLabel', {}, { defaultValue: 'Endpoint URL' })}
              </span>
              <input
                data-mol-id="input-url"
                type="url"
                required
                value={draft.url}
                placeholder="https://example.com/webhooks/delivery-tracking"
                onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md w-full bg-surface text-on-surface font-mono',
                )}
              />
            </label>
            <fieldset className={cm.cn('block')}>
              <legend
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant uppercase tracking-wider',
                  cm.sp('mb', 2),
                )}
              >
                {t('webhooks.newDialog.eventsLabel', {}, { defaultValue: 'Subscribe to events' })}
              </legend>
              <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
                {EVENT_OPTIONS.map((opt) => {
                  const active = draft.events.has(opt.value)
                  return (
                    <label
                      key={opt.value}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        'rounded border',
                        active
                          ? 'bg-primary text-on-primary border-primary'
                          : 'border-outline-variant text-on-surface-variant',
                        'cursor-pointer',
                      )}
                    >
                      <input
                        data-mol-id={`checkbox-${opt.value}`}
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleEvent(opt.value)}
                        className="sr-only"
                      />
                      {t(`webhooks.event.${opt.value}`, {}, { defaultValue: opt.defaultLabel })}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            {submitError ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{submitError}</p>
            ) : null}
            <footer className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), cm.sp('pt', 2))}>
              <button
                type="button"
                data-mol-id="button-cancel"
                onClick={() => {
                  setCreatorOpen(false)
                  setSubmitError(null)
                  setCreatedSecret(null)
                }}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-md border border-outline-variant text-on-surface',
                )}
              >
                {t('webhooks.newDialog.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                data-mol-id="button-submit"
                disabled={submitting}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md disabled:opacity-50',
                )}
              >
                {submitting
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('webhooks.newDialog.submit', {}, { defaultValue: 'Create endpoint' })}
              </button>
            </footer>
          </form>
        </div>
      ) : null}

      {createdSecret ? (
        <div
          role="status"
          data-mol-id="webhook-secret"
          className={cm.cn(cm.card(), cm.sp('p', 4), 'border border-warning')}
        >
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {t(
              'webhooks.secretShownOnce',
              {},
              { defaultValue: 'Save this signing secret — it will not be shown again.' },
            )}
          </p>
          <code className={cm.cn(cm.textSize('xs'), 'font-mono block break-all', cm.sp('mt', 2))}>
            {createdSecret}
          </code>
          <button
            type="button"
            data-mol-id="button-dismiss-secret"
            onClick={() => setCreatedSecret(null)}
            className={cm.cn(cm.textSize('xs'), cm.textPrimary, cm.sp('mt', 2))}
          >
            {t('webhooks.dismissSecret', {}, { defaultValue: 'I have saved it' })}
          </button>
        </div>
      ) : null}

      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider',
            'text-on-surface-variant',
          )}
        >
          {t('webhooks.endpointsHeading', {}, { defaultValue: 'Endpoints' })}
        </h2>
        <ul className={'space-y-2'}>
          {endpoints.map((e) => {
            const active = selectedEndpoint === e.id
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setSelectedEndpoint(active ? null : e.id)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 3),
                    cm.flex({ align: 'center', gap: 'md' }),
                    'block w-full rounded text-left',
                    active ? 'bg-primary-container' : 'hover:bg-surface-container',
                  )}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: e.active
                        ? 'var(--color-status-delivered)'
                        : 'var(--color-status-pending)',
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />
                  <code className={cm.cn(cm.textSize('xs'), 'font-mono', cm.flex1, 'truncate')}>
                    {e.url}
                  </code>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'shrink-0')}>
                    {t(
                      'webhooks.eventCount',
                      { count: e.events.length },
                      { defaultValue: '{{count}} events' },
                    )}
                  </span>
                  {e.last_delivery && (
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        'shrink-0 font-mono',
                      )}
                    >
                      {new Date(e.last_delivery).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider',
              'text-on-surface-variant',
            )}
          >
            {t('webhooks.eventsHeading', {}, { defaultValue: 'Recent deliveries' })}
          </h2>
          {selectedEndpoint && (
            <button
              type="button"
              onClick={() => setSelectedEndpoint(null)}
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), cm.textPrimary)}
            >
              {t('webhooks.showAllLabel', {}, { defaultValue: 'Show all endpoints' })}
            </button>
          )}
        </div>
        <ul className={'space-y-1'}>
          {visibleEvents.slice(0, 30).map((e) => (
            <li
              key={e.id}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.flex({ align: 'center', gap: 'md' }),
                'rounded hover:bg-surface-container',
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  'shrink-0 font-mono',
                )}
                style={{ width: '180px' }}
              >
                {new Date(e.delivered_at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <span
                className={cm.cn(cm.textSize('xs'), 'shrink-0 font-mono', cm.fontWeight('medium'))}
                style={{ width: '180px' }}
              >
                {e.event_type}
              </span>
              <code
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-mono',
                  'text-on-surface-variant',
                  cm.flex1,
                  'truncate',
                )}
              >
                {e.payload_preview}
              </code>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  'shrink-0 font-mono',
                )}
              >
                {e.http_status ?? '—'}
              </span>
              {e.retry_count > 0 && (
                <span className={cm.cn(cm.textSize('xs'), 'shrink-0', 'text-warning')}>
                  {t(
                    'webhooks.retryCount',
                    { count: e.retry_count },
                    { defaultValue: '{{count}} retry' },
                  )}
                </span>
              )}
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  'rounded shrink-0',
                  STATUS_COLOR[e.status],
                )}
              >
                {t(`webhooks.status.${e.status}`, {}, { defaultValue: e.status })}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
