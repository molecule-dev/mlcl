import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { PriceAlertCard, type PriceAlertSummary } from '../components/PriceAlertCard.js'

interface ApiAlert {
  id: string
  origin_iata: string
  origin_city?: string
  destination_iata: string
  destination_city?: string
  target_price_cents: number
  current_lowest_cents?: number | null
  departure_date?: string
  history?: number[] | null
  active?: boolean
}

function toSummary(api: ApiAlert): PriceAlertSummary {
  const target = (api.target_price_cents ?? 0) / 100
  const current = api.current_lowest_cents != null ? api.current_lowest_cents / 100 : target
  return {
    id: String(api.id),
    origin_code: api.origin_iata,
    origin_city: api.origin_city,
    destination_code: api.destination_iata,
    destination_city: api.destination_city,
    target_price: target,
    current_lowest: current,
    departure_date: api.departure_date ?? '',
    history: Array.isArray(api.history) ? api.history : [],
    active: api.active !== false,
  }
}

export function PriceAlerts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [alerts, setAlerts] = useState<PriceAlertSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formState, setFormState] = useState({
    origin: '',
    destination: '',
    target: '',
    departure: '',
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  function loadAlerts() {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/alerts')
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray((res as { data?: unknown }).data)
          ? (res as { data: ApiAlert[] }).data
          : Array.isArray(res as unknown as ApiAlert[])
            ? (res as unknown as ApiAlert[])
            : []
        setAlerts(list.map(toSummary))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('[PriceAlerts] load failed:', err)
        setAlerts([])
        setError(t('priceAlerts.errorMessage', {}, { defaultValue: 'Could not load alerts.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }

  useEffect(() => loadAlerts(), [http]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(id: string, next: boolean) {
    setAlerts((prev) => prev.map((alert) => (alert.id === id ? { ...alert, active: next } : alert)))
    try {
      await http.put(`/api/alerts/${encodeURIComponent(id)}`, { active: next })
    } catch (err: unknown) {
      console.error('[PriceAlerts] toggle failed:', err)
      // Revert on failure
      setAlerts((prev) =>
        prev.map((alert) => (alert.id === id ? { ...alert, active: !next } : alert)),
      )
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('priceAlerts.deleteConfirm', {}, { defaultValue: 'Remove this alert?' })))
      return
    const before = alerts
    setAlerts((prev) => prev.filter((alert) => alert.id !== id))
    try {
      await http.delete(`/api/alerts/${encodeURIComponent(id)}`)
      void track({ name: 'alert.deleted', properties: { alert_id: id } })
    } catch (err: unknown) {
      console.error('[PriceAlerts] delete failed:', err)
      setAlerts(before)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    const origin = formState.origin.trim().toUpperCase()
    const destination = formState.destination.trim().toUpperCase()
    const target = Number(formState.target)
    if (origin.length !== 3 || destination.length !== 3) {
      setCreateError(
        t(
          'priceAlerts.form.iataError',
          {},
          { defaultValue: 'Enter 3-letter IATA codes for origin and destination.' },
        ),
      )
      return
    }
    if (!Number.isFinite(target) || target <= 0) {
      setCreateError(
        t('priceAlerts.form.targetError', {}, { defaultValue: 'Enter a valid target price.' }),
      )
      return
    }
    setCreating(true)
    try {
      const created = (await http.post('/api/alerts', {
        origin_iata: origin,
        destination_iata: destination,
        target_price_cents: Math.round(target * 100),
        departure_date: formState.departure || undefined,
      })) as { data?: { id?: string } }
      void track({
        name: 'alert.created',
        properties: {
          alert_id: created?.data?.id ?? null,
          origin,
          destination,
          target_price: target,
        },
      })
      setShowForm(false)
      setFormState({ origin: '', destination: '', target: '', departure: '' })
      loadAlerts()
    } catch (err: unknown) {
      console.error('[PriceAlerts] create failed:', err)
      setCreateError(
        t('priceAlerts.form.createError', {}, { defaultValue: 'Could not create alert.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  const active = alerts.filter((a) => a.active !== false)
  const hits = alerts.filter((a) => a.current_lowest <= a.target_price)
  const avgDelta =
    alerts.length > 0
      ? alerts.reduce(
          (sum, a) => sum + ((a.current_lowest - a.target_price) / a.target_price) * 100,
          0,
        ) / alerts.length
      : 0

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header
        className={cm.cn(
          cm.sp('mb', 6),
          cm.flex({ align: 'end', justify: 'between', gap: 'md', wrap: 'wrap' }),
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('priceAlerts.eyebrow', { app: APP_NAME }, { defaultValue: '{{app}} watchlist' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 2),
              'leading-tight tracking-tight',
            )}
          >
            {t('priceAlerts.heading', {}, { defaultValue: 'Price alerts' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 2),
              cm.maxW('2xl'),
              'text-on-surface-variant',
            )}
          >
            {t(
              'priceAlerts.subheading',
              { app: APP_NAME },
              {
                defaultValue:
                  'Watch fares like a hawk — {{app}} pings you the second a tracked route dips below its target price.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm' }),
            'rounded-full bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            {showForm ? 'close' : 'add_alert'}
          </span>
          {showForm
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('priceAlerts.addAlert', {}, { defaultValue: 'Add alert' })}
        </button>
      </header>

      {showForm ? (
        <form
          onSubmit={handleCreate}
          className={cm.cn(
            cm.sp('p', 5),
            cm.sp('mb', 8),
            'bg-surface rounded-2xl ring-1 ring-outline-variant/40 shadow-sm',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              'uppercase tracking-[0.25em] text-on-surface-variant',
            )}
          >
            {t('priceAlerts.form.heading', {}, { defaultValue: 'Track a route' })}
          </h2>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-4 gap-3')}>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('priceAlerts.form.origin', {}, { defaultValue: 'Origin (IATA)' })}
              </span>
              <input
                type="text"
                value={formState.origin}
                onChange={(e) => setFormState((s) => ({ ...s, origin: e.target.value }))}
                maxLength={3}
                placeholder="JFK"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors uppercase',
                )}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('priceAlerts.form.destination', {}, { defaultValue: 'Destination (IATA)' })}
              </span>
              <input
                type="text"
                value={formState.destination}
                onChange={(e) => setFormState((s) => ({ ...s, destination: e.target.value }))}
                maxLength={3}
                placeholder="CDG"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors uppercase',
                )}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('priceAlerts.form.target', {}, { defaultValue: 'Target price (USD)' })}
              </span>
              <input
                type="number"
                value={formState.target}
                onChange={(e) => setFormState((s) => ({ ...s, target: e.target.value }))}
                min={0}
                step={1}
                placeholder="500"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
                )}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('priceAlerts.form.departure', {}, { defaultValue: 'Departure (optional)' })}
              </span>
              <input
                type="date"
                value={formState.departure}
                onChange={(e) => setFormState((s) => ({ ...s, departure: e.target.value }))}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
                )}
              />
            </label>
          </div>
          {createError ? (
            <p className={cm.cn(cm.sp('mt', 3), cm.textSize('sm'), 'text-error')}>{createError}</p>
          ) : null}
          <div
            className={cm.cn(
              cm.sp('mt', 4),
              cm.flex({ align: 'center', justify: 'end', gap: 'sm' }),
            )}
          >
            <button
              type="submit"
              disabled={creating}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'sm' }),
                'rounded-xl bg-accent text-on-accent hover:bg-accent/90 transition-colors shadow-lg disabled:opacity-60',
              )}
            >
              {creating
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('priceAlerts.form.submit', {}, { defaultValue: 'Save alert' })}
            </button>
          </div>
        </form>
      ) : null}

      {/* Stat triad */}
      <section className={cm.cn(cm.sp('mb', 8), 'grid grid-cols-1 md:grid-cols-3 gap-5')}>
        <StatCard
          eyebrow={t('priceAlerts.stat.tracked', {}, { defaultValue: 'Routes tracked' })}
          value={`${alerts.length}`}
          icon="track_changes"
          accent="border-tracked text-tracked"
        />
        <StatCard
          eyebrow={t('priceAlerts.stat.active', {}, { defaultValue: 'Currently active' })}
          value={`${active.length}`}
          icon="notifications_active"
          accent="border-primary text-primary"
        />
        <StatCard
          eyebrow={t('priceAlerts.stat.deltaLabel', {}, { defaultValue: 'Avg. vs target' })}
          value={`${avgDelta >= 0 ? '+' : ''}${avgDelta.toFixed(1)}%`}
          icon={avgDelta < 0 ? 'trending_down' : 'trending_up'}
          accent={avgDelta < 0 ? 'border-cheapest text-cheapest' : 'border-deal text-deal'}
        />
      </section>

      {/* Hit banner */}
      {hits.length > 0 ? (
        <section
          className={cm.cn(
            cm.sp('p', 5),
            cm.sp('mb', 8),
            cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
            'rounded-2xl bg-cheapest-light text-cheapest ring-1 ring-cheapest/30',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              'bg-cheapest text-white',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              celebration
            </span>
          </span>
          <div className={'min-w-0 flex-1'}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest',
              )}
            >
              {t(
                'priceAlerts.hits.heading',
                { count: hits.length },
                { defaultValue: '{{count}} target hit' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-cheapest/85')}>
              {t(
                'priceAlerts.hits.body',
                {},
                {
                  defaultValue:
                    'Book before the fare bounces — error fares typically last under 12 hours.',
                },
              )}
            </p>
          </div>
        </section>
      ) : null}

      {/* Alerts list */}
      <section>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 4),
            'uppercase tracking-[0.25em] text-on-surface-variant',
          )}
        >
          {t('priceAlerts.listHeading', {}, { defaultValue: 'Watching' })}
        </h2>
        {error ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
        ) : loading ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
            {t('priceAlerts.loading', {}, { defaultValue: 'Loading alerts…' })}
          </p>
        ) : alerts.length === 0 ? (
          <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
            <p className={cm.cn(cm.textSize('lg'), cm.sp('mb', 4), 'text-on-surface-variant')}>
              {t('priceAlerts.empty', {}, { defaultValue: 'No tracked routes yet.' })}
            </p>
            <Link
              to="/search"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'inline-block rounded-full bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm',
              )}
            >
              {t('priceAlerts.emptyCta', {}, { defaultValue: 'Search a route to track' })}
            </Link>
          </div>
        ) : (
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            {alerts.map((alert) => (
              <PriceAlertCard
                key={alert.id}
                alert={alert}
                onToggleActive={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  eyebrow,
  value,
  icon,
  accent,
}: {
  eyebrow: string
  value: string
  icon: string
  accent: string
}) {
  const cm = getClassMap()
  return (
    <article
      className={cm.cn(
        cm.sp('p', 5),
        'group relative bg-surface rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border-l-4',
        accent,
      )}
    >
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(10),
          cm.h(10),
          'rounded-xl bg-surface-container ring-1 ring-outline-variant',
        )}
        aria-hidden="true"
      >
        <span className="material-symbols-outlined">{icon}</span>
      </span>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          cm.sp('mt', 4),
          'uppercase tracking-[0.25em] text-on-surface-variant',
        )}
      >
        {eyebrow}
      </p>
      <p
        className={cm.cn(
          cm.textSize('3xl'),
          cm.fontWeight('bold'),
          cm.sp('mt', 2),
          'tabular-nums leading-none',
        )}
      >
        {value}
      </p>
    </article>
  )
}
