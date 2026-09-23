import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { getClient as getHttpClient } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { PayloadViewer } from '../components/PayloadViewer.js'
import { StatusPill } from '../components/StatusPill.js'
import { useApi } from '../lib/useApi.js'

const PANEL_BG = 'var(--mol-color-surface)'
const PANEL_BORDER = 'var(--mol-color-border)'

interface ApiEventType {
  id: string
  user_id: string
  name: string
  description: string
  payload_schema: unknown
  created_at: string
  updated_at: string
}

interface ApiEvent {
  id: string
  user_id: string
  name: string
  payload: unknown
  delivery_status: string
  created_at: string
}

interface ApiWebhook {
  id: string
  url: string
  events: string
  is_active: boolean
}

const SAMPLE_FALLBACK = {
  message: 'No emitted events for this type yet — fire a test to populate.',
}

export function EventDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const eventId = id ?? ''
  const [firing, setFiring] = useState(false)
  const [fireError, setFireError] = useState<string | null>(null)
  const [fireOk, setFireOk] = useState(false)

  const { data: types } = useApi<ApiEventType[]>('/events/types?limit=500')
  const { data: events, refetch: refetchEvents } = useApi<ApiEvent[]>(
    `/events?name=${encodeURIComponent(eventId)}&limit=200`,
    [eventId],
  )
  // webhooks list caps limit at 200 server-side — 500 is a 400.
  const { data: endpoints } = useApi<ApiWebhook[]>('/webhooks?limit=200')

  const typeDef = useMemo(
    () => (types ?? []).find((tp) => tp.name === eventId) ?? null,
    [types, eventId],
  )
  const samplePayload = useMemo(() => {
    const e = (events ?? [])[0]
    if (!e) return SAMPLE_FALLBACK
    return e.payload ?? SAMPLE_FALLBACK
  }, [events])

  const subscribers = useMemo(() => {
    const list = endpoints ?? []
    return list.filter((ep) => {
      try {
        const parsed = JSON.parse(ep.events) as string[]
        return parsed.includes(eventId) || parsed.includes('*')
      } catch (_error) {
        // invalid JSON in ep.events — exclude endpoint from subscribers
        return false
      }
    })
  }, [endpoints, eventId])

  const fired24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    return (events ?? []).filter((e) => new Date(e.created_at).getTime() >= cutoff).length
  }, [events])

  const successRate = useMemo(() => {
    const list = events ?? []
    if (list.length === 0) return null
    const ok = list.filter((e) => e.delivery_status === 'delivered').length
    return Math.round((ok / list.length) * 1000) / 10
  }, [events])

  async function fireTest() {
    if (!eventId) return
    setFiring(true)
    setFireError(null)
    setFireOk(false)
    try {
      const client = getHttpClient()
      await client.post('/events', {
        name: eventId,
        category: typeDef?.name?.split('.')[0] ?? null,
        description: typeDef?.description,
        payload: { test: true, fired_at: new Date().toISOString() },
      })
      track({ name: 'event.emitted', properties: { event_type: eventId } })
      setFireOk(true)
      await refetchEvents()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fire test event'
      setFireError(msg)
    } finally {
      setFiring(false)
    }
  }

  const schemaForView = typeDef?.payload_schema ?? {
    note: 'No schema registered for this event type. POST /api/events/types with a payload_schema to register one.',
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 6), 'max-w-7xl mx-auto')}
      style={{ color: 'var(--mol-color-text)' }}
    >
      <div
        className={cm.cn('mb-2 flex items-center gap-2 text-xs font-mono')}
        style={{ color: 'var(--mol-color-text-tertiary)' }}
      >
        <Link to="/events" className={cm.cn('hover:underline')}>
          {t('eventDetail.crumb', {}, { defaultValue: 'events' })}
        </Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: 'var(--mol-color-text-secondary)' }}>{eventId}</span>
      </div>

      <div className={cm.cn('flex items-end justify-between gap-4 flex-wrap mb-6')}>
        <div className={cm.cn('min-w-0 flex-1')}>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {typeDef
              ? t('eventDetail.eyebrow', {}, { defaultValue: 'event · cataloged' })
              : t('eventDetail.uncataloged', {}, { defaultValue: 'event · uncataloged' })}
          </p>
          <h1
            className={cm.cn('font-mono text-2xl md:text-3xl font-extrabold tracking-tight')}
            style={{ color: 'var(--mol-color-text)' }}
          >
            {eventId}
          </h1>
          <p className={cm.cn('mt-1 text-sm')} style={{ color: 'var(--mol-color-text-secondary)' }}>
            {typeDef?.description ??
              t(
                'eventDetail.subtitleFallback',
                {},
                { defaultValue: 'No description on file. Register this event type to add one.' },
              )}
          </p>
        </div>
        <div className={cm.cn('flex items-center gap-2')}>
          <button
            type="button"
            onClick={fireTest}
            disabled={firing}
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono font-semibold text-sm transition-colors',
            )}
            style={{
              border: '1px solid var(--mol-color-border)',
              color: 'var(--mol-color-text)',
              opacity: firing ? 0.6 : 1,
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              science
            </span>
            {firing
              ? t('eventDetail.firing', {}, { defaultValue: 'Firing…' })
              : t('eventDetail.fireTest', {}, { defaultValue: 'Fire test event' })}
          </button>
        </div>
      </div>

      {fireError && (
        <div
          className={cm.cn('rounded-md px-4 py-2 mb-4 text-sm')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--mol-color-error) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--mol-color-error) 30%, transparent)',
            color: 'var(--mol-color-error)',
          }}
        >
          {fireError}
        </div>
      )}
      {fireOk && (
        <div
          className={cm.cn('rounded-md px-4 py-2 mb-4 text-sm font-mono')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--mol-color-success) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--mol-color-success) 30%, transparent)',
            color: 'var(--mol-color-success)',
          }}
        >
          {t(
            'eventDetail.fired',
            {},
            { defaultValue: 'Test event fired and queued for delivery.' },
          )}
        </div>
      )}

      <div className={cm.cn('grid gap-4 mb-6 grid-cols-1 sm:grid-cols-3')}>
        <MetricStatCard
          eyebrow={t('eventDetail.metric.fired', {}, { defaultValue: 'Fired · 24h' })}
          value={String(fired24h)}
          tone="success"
          icon="bolt"
        />
        <MetricStatCard
          eyebrow={t('nav.subscribers', {}, { defaultValue: 'Subscribers' })}
          value={String(subscribers.length)}
          tone="info"
          icon="hub"
        />
        <MetricStatCard
          eyebrow={t('eventDetail.metric.success', {}, { defaultValue: 'Delivered' })}
          value={successRate !== null ? `${successRate}%` : '—'}
          tone="success"
          icon="task_alt"
        />
      </div>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <section className={cm.cn('lg:col-span-7 flex flex-col gap-6')}>
          <div>
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight mb-3')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('eventDetail.schema', {}, { defaultValue: 'JSON schema' })}
            </h2>
            <PayloadViewer
              value={schemaForView}
              eyebrow="// schema"
              contentType="application/schema+json"
            />
          </div>
          <div>
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight mb-3')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('eventDetail.sample', {}, { defaultValue: 'Sample payload' })}
            </h2>
            <PayloadViewer
              value={samplePayload}
              eyebrow="// sample"
              contentType="application/json"
            />
          </div>
        </section>

        <aside className={cm.cn('lg:col-span-5 flex flex-col gap-6')}>
          <div
            className={cm.cn('rounded-xl p-5')}
            style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
          >
            <div className={cm.cn('flex items-center justify-between mb-4')}>
              <h2
                className={cm.cn('text-base font-extrabold tracking-tight')}
                style={{ color: 'var(--mol-color-text)' }}
              >
                {t('eventDetail.subscribers', {}, { defaultValue: 'Subscribed endpoints' })}
              </h2>
              <Link
                to="/endpoints"
                className={cm.cn(
                  'font-mono text-[10px] font-bold uppercase tracking-widest hover:underline',
                )}
                style={{ color: BRAND_COLOR }}
              >
                {t('eventDetail.manage', {}, { defaultValue: 'manage →' })}
              </Link>
            </div>
            {subscribers.length === 0 ? (
              <p
                className={cm.cn('font-mono text-xs')}
                style={{ color: 'var(--mol-color-text-tertiary)' }}
              >
                {t(
                  'eventDetail.noSubscribers',
                  {},
                  { defaultValue: 'No endpoints subscribe to this event yet.' },
                )}
              </p>
            ) : (
              <ul className={cm.cn('flex flex-col gap-2')}>
                {subscribers.map((s) => (
                  <li
                    key={s.id}
                    className={cm.cn(
                      'flex items-center justify-between gap-2 px-3 py-2 rounded-md',
                    )}
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--mol-color-background) 60%, transparent)',
                      border: '1px solid var(--mol-color-border)',
                    }}
                  >
                    <Link
                      to={`/endpoints/${s.id}`}
                      className={cm.cn('font-mono text-xs truncate flex-1 hover:underline')}
                      style={{ color: 'var(--mol-color-text)' }}
                      title={s.url}
                    >
                      {s.url}
                    </Link>
                    <StatusPill status={s.is_active ? 'live' : 'paused'} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
