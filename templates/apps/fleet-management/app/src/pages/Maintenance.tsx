import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface MaintenanceItem {
  id: string
  vehicle_id: string
  vehicle_plate: string
  type: 'oil_change' | 'tire_rotation' | 'inspection' | 'brake_service' | 'repair' | 'other'
  description: string
  scheduled_for: string
  status: 'scheduled' | 'in_progress' | 'overdue' | 'completed'
  technician: string | null
  cost_estimate: number | null
}

const STATUSES = ['overdue', 'scheduled', 'in_progress', 'completed', 'all'] as const
type Filter = (typeof STATUSES)[number]

const STATUS_COLOR: Record<MaintenanceItem['status'], string> = {
  scheduled: 'bg-info-container text-on-info-container',
  in_progress: 'bg-warning-container text-on-warning-container',
  overdue: 'bg-error-container text-on-error-container',
  completed: 'bg-success-container text-on-success-container',
}

const TYPE_LABEL: Record<MaintenanceItem['type'], string> = {
  oil_change: 'Oil change',
  tire_rotation: 'Tire rotation',
  inspection: 'Inspection',
  brake_service: 'Brake service',
  repair: 'Repair',
  other: 'Other',
}

interface VehicleOption {
  id: string
  plate: string
}

export function Maintenance() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<MaintenanceItem[]>([])
  const [vehicles, setVehicles] = useState<VehicleOption[]>([])
  const [filter, setFilter] = useState<Filter>('overdue')
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
  const [form, setForm] = useState({
    vehicle_id: '',
    type: 'oil_change',
    description: '',
    scheduled_for: '',
    cost_estimate: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    return http
      .get('/maintenance')
      .then((res) => {
        setList(unwrapList<MaintenanceItem>(res))
        setError(null)
      })
      .catch(() =>
        setError(t('maintenance.loadError', {}, { defaultValue: 'Failed to load maintenance.' })),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([http.get('/maintenance'), http.get('/vehicles').catch(() => null)])
      .then(([m, v]) => {
        if (cancelled) return
        setList(unwrapList<MaintenanceItem>(m))
        setVehicles(unwrapList<VehicleOption>(v))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('maintenance.loadError', {}, { defaultValue: 'Failed to load maintenance.' }))
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
    if (!form.vehicle_id || !form.scheduled_for) {
      setSubmitError(
        t(
          'maintenance.add.error.required',
          {},
          {
            defaultValue: 'Vehicle and scheduled date are required.',
          },
        ),
      )
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await http.post('/maintenance', {
        vehicle_id: form.vehicle_id,
        type: form.type,
        description: form.description.trim() || form.type,
        scheduled_for: new Date(form.scheduled_for).toISOString(),
        cost_estimate: form.cost_estimate ? Number(form.cost_estimate) : undefined,
      })
      const created = unwrapSingle<{ id?: string }>(res)
      void track({
        name: 'maintenance.scheduled',
        properties: { maintenance_id: created?.id, vehicle_id: form.vehicle_id, type: form.type },
      })
      setShowAdd(false)
      setForm({
        vehicle_id: '',
        type: 'oil_change',
        description: '',
        scheduled_for: '',
        cost_estimate: '',
      })
      await load()
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : t('maintenance.add.error.generic', {}, { defaultValue: 'Failed to schedule.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const visible = filter === 'all' ? list : list.filter((m) => m.status === filter)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('maintenance.heading', {}, { defaultValue: 'Maintenance' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'maintenance.subheading',
              { count: visible.length },
              { defaultValue: '{{count}} work orders' },
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
          + {t('maintenance.scheduleLabel', {}, { defaultValue: 'Schedule service' })}
        </button>
      </header>

      {showAdd ? (
        <div
          className={cm.cn('fixed inset-0 z-50', cm.flex({ align: 'center', justify: 'center' }))}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-maint-heading"
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
            <h2 id="add-maint-heading" className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('maintenance.add.heading', {}, { defaultValue: 'Schedule service' })}
            </h2>

            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('maintenance.add.vehicle', {}, { defaultValue: 'Vehicle' })}
              </span>
              <select
                required
                value={form.vehicle_id}
                onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'border border-outline-variant rounded-md',
                  cm.textSize('sm'),
                )}
              >
                <option value="">
                  {t('maintenance.add.selectVehicle', {}, { defaultValue: 'Select vehicle…' })}
                </option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate}
                  </option>
                ))}
              </select>
            </label>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('form.type', {}, { defaultValue: 'Type' })}
              </span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'border border-outline-variant rounded-md',
                  cm.textSize('sm'),
                )}
              >
                {(Object.keys(TYPE_LABEL) as MaintenanceItem['type'][]).map((type) => (
                  <option key={type} value={type}>
                    {t(`maintenance.type.${type}`, {}, { defaultValue: TYPE_LABEL[type] })}
                  </option>
                ))}
              </select>
            </label>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('form.description', {}, { defaultValue: 'Description' })}
              </span>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                {t('maintenance.add.scheduledFor', {}, { defaultValue: 'Scheduled date' })}
              </span>
              <input
                type="date"
                required
                value={form.scheduled_for}
                onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })}
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
                {t('maintenance.add.cost', {}, { defaultValue: 'Estimated cost ($)' })}
              </span>
              <input
                type="number"
                value={form.cost_estimate}
                onChange={(e) => setForm({ ...form, cost_estimate: e.target.value })}
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
                  : t('nav.schedule', {}, { defaultValue: 'Schedule' })}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <nav
        aria-label={t('maintenance.filterLabel', {}, { defaultValue: 'Filter maintenance' })}
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
                `maintenance.status.${s}`,
                {},
                { defaultValue: s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
              )}
            </button>
          )
        })}
      </nav>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('maintenance.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('maintenance.empty', {}, { defaultValue: 'No work orders match.' })}
        </p>
      ) : (
        <ul className={'space-y-2'}>
          {visible.map((m) => (
            <li key={m.id}>
              <Link
                to={`/maintenance/${m.id}`}
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', gap: 'md' }),
                  'hover:bg-surface-container',
                )}
              >
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
                    <span
                      className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'font-mono')}
                    >
                      {m.vehicle_plate}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>·</span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(`maintenance.type.${m.type}`, {}, { defaultValue: TYPE_LABEL[m.type] })}
                    </span>
                  </div>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      cm.sp('mt', 1),
                      'truncate',
                    )}
                  >
                    {m.description}
                  </p>
                  {m.technician && (
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        cm.sp('mt', 1),
                      )}
                    >
                      {t(
                        'maintenance.technicianLabel',
                        { name: m.technician },
                        { defaultValue: 'Technician: {{name}}' },
                      )}
                    </p>
                  )}
                </div>
                <div className={cm.cn(cm.shrink0, cm.textCenter)}>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('maintenance.scheduledFor', {}, { defaultValue: 'Scheduled' })}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'font-mono')}>
                    {new Date(m.scheduled_for).toLocaleDateString()}
                  </p>
                </div>
                {m.cost_estimate !== null && (
                  <div className={cm.cn(cm.shrink0, cm.textCenter)}>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t('maintenance.estimate', {}, { defaultValue: 'Est.' })}
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'font-mono')}>
                      ${m.cost_estimate.toLocaleString()}
                    </p>
                  </div>
                )}
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'rounded shrink-0',
                    STATUS_COLOR[m.status],
                  )}
                >
                  {t(
                    `maintenance.status.${m.status}`,
                    {},
                    { defaultValue: m.status.replace('_', ' ') },
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
