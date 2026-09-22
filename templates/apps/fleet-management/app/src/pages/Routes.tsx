import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Route {
  id: string
  name: string
  driver: string
  vehicle_plate: string
  origin: string
  destination: string
  stops_count: number
  stops_completed: number
  status: 'planned' | 'active' | 'completed' | 'deviated'
  eta: string
  miles: number
  started_at: string | null
}

const STATUSES = ['active', 'planned', 'completed', 'deviated', 'all'] as const
type Filter = (typeof STATUSES)[number]

const STATUS_COLOR: Record<Route['status'], string> = {
  active: 'bg-info-container text-on-info-container',
  planned: 'bg-surface-container text-on-surface',
  completed: 'bg-success-container text-on-success-container',
  deviated: 'bg-error-container text-on-error-container',
}

interface VehicleOption {
  id: string
  plate: string
}
interface DriverOption {
  id: string
  name: string
}

export function Routes() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Route[]>([])
  const [vehicles, setVehicles] = useState<VehicleOption[]>([])
  const [drivers, setDrivers] = useState<DriverOption[]>([])
  const [filter, setFilter] = useState<Filter>('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  // Escape closes the add modal (keyboard equivalent of the pointer-only
  // backdrop click).
  useEffect(() => {
    if (!showAdd) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAdd(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAdd])
  const [form, setForm] = useState({ name: '', vehicle_id: '', driver_id: '', scheduled_date: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    return http
      .get('/routes')
      .then((res) => {
        setList(unwrapList<Route>(res))
        setError(null)
      })
      .catch(() => setError(t('routes.loadError', {}, { defaultValue: 'Failed to load routes.' })))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/routes'),
      http.get('/vehicles').catch(() => null),
      http.get('/drivers').catch(() => null),
    ])
      .then(([r, v, d]) => {
        if (cancelled) return
        setList(unwrapList<Route>(r))
        setVehicles(unwrapList<VehicleOption>(v))
        setDrivers(unwrapList<DriverOption>(d))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('routes.loadError', {}, { defaultValue: 'Failed to load routes.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function submitNew(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) {
      setSubmitError(t('auth.signup.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await http.post('/routes', {
        name: form.name.trim(),
        vehicle_id: form.vehicle_id || undefined,
        driver_id: form.driver_id || undefined,
        scheduled_date: form.scheduled_date
          ? new Date(form.scheduled_date).toISOString()
          : undefined,
      })
      const created = unwrapSingle<{ id?: string }>(res)
      void track({
        name: 'route.created',
        properties: { route_id: created?.id, has_driver: Boolean(form.driver_id) },
      })
      setShowAdd(false)
      setForm({ name: '', vehicle_id: '', driver_id: '', scheduled_date: '' })
      await load()
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : t('routes.add.error.generic', {}, { defaultValue: 'Failed to create route.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const visible = useMemo(
    () => (filter === 'all' ? list : list.filter((r) => r.status === filter)),
    [list, filter],
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('routes.heading', {}, { defaultValue: 'Routes' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'routes.subheading',
              { count: visible.length },
              { defaultValue: '{{count}} routes' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          + {t('routes.dispatchLabel', {}, { defaultValue: 'New dispatch' })}
        </button>
      </header>

      {showAdd ? (
        <div
          className={cm.cn('fixed inset-0 z-50', cm.flex({ align: 'center', justify: 'center' }))}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-route-heading"
        >
          <div
            aria-hidden="true"
            onClick={() => setShowAdd(false)}
            className={cm.cn('absolute inset-0 bg-foreground/40')}
          />
          <form
            onSubmit={submitNew}
            className={cm.cn(cm.card(), cm.sp('p', 6), 'relative max-w-md w-full', cm.stack(4))}
          >
            <h2 id="add-route-heading" className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('routes.add.heading', {}, { defaultValue: 'New dispatch' })}
            </h2>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('routes.add.name', {}, { defaultValue: 'Route name' })}
              </span>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'border border-outline-variant rounded-md',
                  cm.textSize('sm'),
                )}
              />
            </label>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('routes.add.vehicle', {}, { defaultValue: 'Vehicle' })}
              </span>
              <select
                value={form.vehicle_id}
                onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'border border-outline-variant rounded-md',
                  cm.textSize('sm'),
                )}
              >
                <option value="">—</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate}
                  </option>
                ))}
              </select>
            </label>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('routes.add.driver', {}, { defaultValue: 'Driver' })}
              </span>
              <select
                value={form.driver_id}
                onChange={(e) => setForm({ ...form, driver_id: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'border border-outline-variant rounded-md',
                  cm.textSize('sm'),
                )}
              >
                <option value="">—</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('routes.add.scheduled', {}, { defaultValue: 'Scheduled' })}
              </span>
              <input
                type="datetime-local"
                value={form.scheduled_date}
                onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'border border-outline-variant rounded-md',
                  cm.textSize('sm'),
                )}
              />
            </label>

            {submitError ? <p className={'text-error text-sm'}>{submitError}</p> : null}

            <div className={cm.flex({ gap: 'sm', justify: 'end' })}>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
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
                  : t('routes.add.submit', {}, { defaultValue: 'Dispatch' })}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <nav
        aria-label={t('routes.filterLabel', {}, { defaultValue: 'Filter routes' })}
        className={cm.cn(cm.flex({ gap: 'xs', align: 'center' }), 'flex-wrap')}
      >
        {STATUSES.map((s) => {
          const active = filter === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'rounded-full',
                active
                  ? 'bg-primary text-on-primary'
                  : cm.cn('bg-surface border border-outline-variant', 'text-on-surface-variant'),
              )}
              aria-pressed={active}
            >
              {t(
                `routes.status.${s}`,
                {},
                { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
              )}
            </button>
          )
        })}
      </nav>

      {/* Map placeholder */}
      <div
        className={'rounded relative overflow-hidden'}
        style={{
          aspectRatio: '21/8',
          backgroundColor: 'var(--color-map-bg)',
          backgroundImage:
            'radial-gradient(circle at 30% 50%, rgba(6, 182, 212, 0.4) 0%, transparent 30%), radial-gradient(circle at 70% 40%, rgba(245, 158, 11, 0.3) 0%, transparent 30%)',
        }}
      >
        <p
          className={cm.cn(cm.textSize('xs'), 'absolute top-3 left-3 font-mono')}
          style={{ color: '#cbd5e1' }}
        >
          {t(
            'routes.mapLabel',
            { count: visible.filter((r) => r.status === 'active').length },
            { defaultValue: '{{count}} active dispatches · live' },
          )}
        </p>
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('routes.empty', {}, { defaultValue: 'No routes match.' })}
        </p>
      ) : (
        <ul className={'space-y-2'}>
          {visible.map((r) => (
            <li key={r.id}>
              <article
                className={cm.cn(cm.card(), cm.sp('p', 4), cm.flex({ align: 'center', gap: 'md' }))}
              >
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'truncate')}>
                    {r.name}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                      'truncate',
                      cm.sp('mt', 1),
                    )}
                  >
                    {r.origin} → {r.destination}
                  </p>
                  <div
                    className={cm.flex({ align: 'center', gap: 'sm' })}
                    style={{ marginTop: '4px' }}
                  >
                    <span
                      className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'font-mono')}
                    >
                      {r.vehicle_plate}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>·</span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {r.driver}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>·</span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'routes.stopsSummary',
                        { completed: r.stops_completed, total: r.stops_count, miles: r.miles },
                        { defaultValue: '{{completed}}/{{total}} stops · {{miles}} mi' },
                      )}
                    </span>
                  </div>
                </div>
                <div className={cm.cn(cm.shrink0, cm.textCenter)}>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('routes.eta', {}, { defaultValue: 'ETA' })}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'font-mono')}>
                    {new Date(r.eta).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'rounded shrink-0',
                    STATUS_COLOR[r.status],
                  )}
                >
                  {t(`routes.status.${r.status}`, {}, { defaultValue: r.status })}
                </span>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
