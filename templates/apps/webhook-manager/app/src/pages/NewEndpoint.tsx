import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { StatusPill } from '../components/StatusPill.js'

const PANEL_BG = 'color-mix(in srgb, var(--mol-color-surface) 60%, transparent)'
const PANEL_BORDER = 'var(--mol-color-border)'
const INPUT_BG = 'var(--mol-color-input-background)'
const FIELD_BORDER = 'var(--mol-color-border)'

const EVENT_OPTIONS = [
  { id: 'order.created', defaultLabel: 'order.created', category: 'orders' },
  { id: 'order.completed', defaultLabel: 'order.completed', category: 'orders' },
  { id: 'order.refunded', defaultLabel: 'order.refunded', category: 'orders' },
  { id: 'payment.succeeded', defaultLabel: 'payment.succeeded', category: 'payments' },
  { id: 'payment.refunded', defaultLabel: 'payment.refunded', category: 'payments' },
  { id: 'subscription.created', defaultLabel: 'subscription.created', category: 'subs' },
  { id: 'subscription.canceled', defaultLabel: 'subscription.canceled', category: 'subs' },
  { id: 'invoice.paid', defaultLabel: 'invoice.paid', category: 'subs' },
  { id: 'user.created', defaultLabel: 'user.created', category: 'identity' },
  { id: 'user.deleted', defaultLabel: 'user.deleted', category: 'identity' },
  { id: 'alert.triggered', defaultLabel: 'alert.triggered', category: 'alerts' },
  { id: 'alert.resolved', defaultLabel: 'alert.resolved', category: 'alerts' },
] as const

export function NewEndpoint() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [url, setUrl] = useState('https://')
  const [description, setDescription] = useState('')
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'development'>(
    'production',
  )
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(
    new Set(['order.created', 'order.completed']),
  )
  const [retryStrategy, setRetryStrategy] = useState<'exponential' | 'linear' | 'none'>(
    'exponential',
  )
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleEvent = (id: string) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitted) return
    setSubmitted(true)
    setError(null)
    try {
      const client = getHttpClient()
      const description_full = description ? `${description} · ${environment}` : `${environment}`
      const res = await client.post<{ id: string }>('/webhooks', {
        name: description || url,
        description: description_full,
        url,
        events: Array.from(selectedEvents),
        retry_count: retryStrategy === 'none' ? 0 : retryStrategy === 'linear' ? 5 : 5,
        is_active: true,
      })
      const id = res.data?.id
      navigate(id ? `/endpoints/${id}` : '/endpoints')
    } catch (err) {
      setSubmitted(false)
      setError(err instanceof Error ? err.message : 'Failed to create endpoint')
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 6), 'max-w-4xl mx-auto')}
      style={{ color: 'var(--mol-color-text)' }}
    >
      <div
        className={cm.cn('mb-2 flex items-center gap-2 text-xs font-mono')}
        style={{ color: 'var(--mol-color-text-tertiary)' }}
      >
        <Link to="/endpoints" className={cm.cn('hover:underline')}>
          {t('newEndpoint.crumb', {}, { defaultValue: 'endpoints' })}
        </Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: 'var(--mol-color-text-secondary)' }}>
          {t('newEndpoint.crumbNew', {}, { defaultValue: 'new' })}
        </span>
      </div>

      <div className={cm.cn('mb-6')}>
        <p
          className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
          style={{ color: BRAND_COLOR }}
        >
          {t('newEndpoint.eyebrow', {}, { defaultValue: 'configure · new endpoint' })}
        </p>
        <h1
          className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
          style={{ color: 'var(--mol-color-text)' }}
        >
          {t('newEndpoint.heading', {}, { defaultValue: 'Wire a new webhook endpoint' })}
        </h1>
        <p
          className={cm.cn('mt-2 text-sm max-w-2xl')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          {t(
            'newEndpoint.body',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} will start signing payloads and tracking deliveries the moment you save. You can rotate the secret and pause delivery at any time.',
            },
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={cm.cn('flex flex-col gap-6')}>
        <section
          className={cm.cn('rounded-xl p-6')}
          style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
        >
          <h2
            className={cm.cn('text-base font-extrabold tracking-tight mb-4')}
            style={{ color: 'var(--mol-color-text)' }}
          >
            {t('newEndpoint.section.target', {}, { defaultValue: 'Target' })}
          </h2>
          <label
            className={cm.cn(
              'block font-mono text-[10px] font-black uppercase tracking-widest mb-2',
            )}
            style={{ color: 'var(--mol-color-text-secondary)' }}
            htmlFor="url"
          >
            {t('newEndpoint.urlLabel', {}, { defaultValue: 'Destination URL' })}
          </label>
          <div className={cm.cn('relative')}>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/webhooks/orders"
              required
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.sp('px', 4),
                'rounded-md font-mono text-sm transition-colors',
              )}
              style={{
                backgroundColor: INPUT_BG,
                border: `1px solid ${FIELD_BORDER}`,
                color: 'var(--mol-color-text)',
              }}
            />
          </div>

          <label
            className={cm.cn(
              'block font-mono text-[10px] font-black uppercase tracking-widest mb-2 mt-5',
            )}
            style={{ color: 'var(--mol-color-text-secondary)' }}
            htmlFor="description"
          >
            {t('form.description', {}, { defaultValue: 'Description' })}
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t(
              'newEndpoint.descriptionPlaceholder',
              {},
              { defaultValue: 'e.g. Acme · production order events' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.sp('px', 4),
              'rounded-md text-sm transition-colors',
            )}
            style={{
              backgroundColor: INPUT_BG,
              border: `1px solid ${FIELD_BORDER}`,
              color: 'var(--mol-color-text)',
            }}
          />

          <p
            className={cm.cn(
              'block font-mono text-[10px] font-black uppercase tracking-widest mt-5 mb-2',
            )}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {t('newEndpoint.envLabel', {}, { defaultValue: 'Environment' })}
          </p>
          <div className={cm.cn('flex items-center gap-2')}>
            {(['production', 'staging', 'development'] as const).map((env) => {
              const active = environment === env
              return (
                <button
                  key={env}
                  type="button"
                  onClick={() => setEnvironment(env)}
                  className={cm.cn(
                    'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest transition-colors',
                  )}
                  style={{
                    backgroundColor: active
                      ? 'color-mix(in srgb, var(--mol-color-success) 15%, transparent)'
                      : 'transparent',
                    color: active ? 'var(--mol-color-success)' : 'var(--mol-color-text-secondary)',
                    boxShadow: active
                      ? 'inset 0 0 0 1px color-mix(in srgb, var(--mol-color-success) 35%, transparent)'
                      : `inset 0 0 0 1px ${FIELD_BORDER}`,
                  }}
                >
                  {t(`newEndpoint.env.${env}`, {}, { defaultValue: env })}
                </button>
              )
            })}
          </div>
        </section>

        <section
          className={cm.cn('rounded-xl p-6')}
          style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
        >
          <div className={cm.cn('flex items-center justify-between mb-4 flex-wrap gap-2')}>
            <div>
              <h2
                className={cm.cn('text-base font-extrabold tracking-tight')}
                style={{ color: 'var(--mol-color-text)' }}
              >
                {t('newEndpoint.section.events', {}, { defaultValue: 'Events to send' })}
              </h2>
              <p className={cm.cn('text-xs')} style={{ color: 'var(--mol-color-text-tertiary)' }}>
                {t(
                  'newEndpoint.eventsHint',
                  {},
                  {
                    defaultValue:
                      'Pick at least one event. You can change this later without affecting the secret.',
                  },
                )}
              </p>
            </div>
            <span
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded',
              )}
              style={{
                backgroundColor: 'color-mix(in srgb, var(--mol-color-secondary) 15%, transparent)',
                color: 'var(--mol-color-secondary)',
              }}
            >
              {selectedEvents.size}{' '}
              {t('newEndpoint.eventsSelected', {}, { defaultValue: 'selected' })}
            </span>
          </div>
          <div className={cm.cn('grid gap-2 grid-cols-1 sm:grid-cols-2')}>
            {EVENT_OPTIONS.map((event) => {
              const checked = selectedEvents.has(event.id)
              return (
                <label
                  key={event.id}
                  className={cm.cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md transition-colors cursor-pointer',
                  )}
                  style={{
                    backgroundColor: checked
                      ? 'color-mix(in srgb, var(--mol-color-success) 10%, transparent)'
                      : 'color-mix(in srgb, var(--mol-color-surface) 60%, transparent)',
                    border: `1px solid ${checked ? 'color-mix(in srgb, var(--mol-color-success) 40%, transparent)' : FIELD_BORDER}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleEvent(event.id)}
                    className={cm.cn('w-4 h-4 rounded')}
                    style={{ accentColor: BRAND_COLOR }}
                  />
                  <span
                    className={cm.cn('font-mono text-xs font-semibold flex-1')}
                    style={{ color: 'var(--mol-color-text)' }}
                  >
                    {event.id}
                  </span>
                  <span
                    className={cm.cn('font-mono text-[9px] font-black uppercase tracking-widest')}
                    style={{ color: 'var(--mol-color-text-tertiary)' }}
                  >
                    {event.category}
                  </span>
                </label>
              )
            })}
          </div>
        </section>

        <section
          className={cm.cn('rounded-xl p-6')}
          style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
        >
          <h2
            className={cm.cn('text-base font-extrabold tracking-tight mb-4')}
            style={{ color: 'var(--mol-color-text)' }}
          >
            {t('newEndpoint.section.delivery', {}, { defaultValue: 'Delivery policy' })}
          </h2>
          <p
            className={cm.cn(
              'block font-mono text-[10px] font-black uppercase tracking-widest mb-2',
            )}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {t('newEndpoint.retryLabel', {}, { defaultValue: 'Retry strategy' })}
          </p>
          <div className={cm.cn('grid gap-3 grid-cols-1 sm:grid-cols-3')}>
            {(['exponential', 'linear', 'none'] as const).map((strategy) => {
              const active = retryStrategy === strategy
              return (
                <button
                  key={strategy}
                  type="button"
                  onClick={() => setRetryStrategy(strategy)}
                  className={cm.cn(
                    'flex flex-col items-start text-left p-4 rounded-md transition-colors',
                  )}
                  style={{
                    backgroundColor: active
                      ? 'color-mix(in srgb, var(--mol-color-success) 10%, transparent)'
                      : 'color-mix(in srgb, var(--mol-color-surface) 60%, transparent)',
                    border: `1px solid ${active ? 'color-mix(in srgb, var(--mol-color-success) 40%, transparent)' : FIELD_BORDER}`,
                  }}
                >
                  <span
                    className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                    style={{
                      color: active
                        ? 'var(--mol-color-success)'
                        : 'var(--mol-color-text-secondary)',
                    }}
                  >
                    {t(`newEndpoint.strategy.${strategy}`, {}, { defaultValue: strategy })}
                  </span>
                  <span
                    className={cm.cn('mt-1 text-sm font-bold')}
                    style={{ color: 'var(--mol-color-text)' }}
                  >
                    {strategy === 'exponential'
                      ? t(
                          'newEndpoint.strategy.exponential.body',
                          {},
                          { defaultValue: '5 retries · 30s → 32m' },
                        )
                      : strategy === 'linear'
                        ? t(
                            'newEndpoint.strategy.linear.body',
                            {},
                            { defaultValue: '5 retries · every 2 min' },
                          )
                        : t(
                            'newEndpoint.strategy.none.body',
                            {},
                            { defaultValue: 'Fire and forget' },
                          )}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <div className={cm.cn('flex items-center justify-between gap-4 flex-wrap')}>
          {error ? (
            <p
              className={cm.cn('text-xs font-mono')}
              style={{ color: 'var(--mol-color-error)' }}
              role="alert"
            >
              {error}
            </p>
          ) : submitted ? (
            <StatusPill status="delivered" label="ENDPOINT CREATED" emphasis />
          ) : (
            <p className={cm.cn('text-xs')} style={{ color: 'var(--mol-color-text-tertiary)' }}>
              {t(
                'newEndpoint.disclaimer',
                { app: APP_NAME },
                {
                  defaultValue:
                    '{{app}} will sign every payload with HMAC-SHA256 and reveal the secret once the endpoint is created.',
                },
              )}
            </p>
          )}
          <div className={cm.cn('flex items-center gap-2')}>
            <Link
              to="/endpoints"
              className={cm.cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono font-semibold text-sm transition-colors',
              )}
              style={{
                border: '1px solid var(--mol-color-border)',
                color: 'var(--mol-color-text)',
              }}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </Link>
            <button
              type="submit"
              disabled={submitted}
              className={cm.cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-mono font-semibold text-sm transition-all hover:opacity-90 shadow-lg disabled:opacity-60',
              )}
              style={{
                backgroundColor: BRAND_COLOR,
                color: 'var(--color-on-primary)',
                boxShadow:
                  '0 8px 24px -8px color-mix(in srgb, var(--mol-color-primary) 40%, transparent)',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                rocket_launch
              </span>
              {submitted
                ? t('newEndpoint.creating', {}, { defaultValue: 'Wiring up…' })
                : t('newEndpoint.create', {}, { defaultValue: 'Create endpoint' })}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
