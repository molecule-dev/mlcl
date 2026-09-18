import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Vehicle {
  id: string
  plate: string
  vin: string
  make: string
  model: string
  year: number
  driver: string | null
  status: 'operational' | 'in_transit' | 'idle' | 'alert' | 'offline'
  location: string
  odometer: number
  speed_mph: number
  battery_pct: number
  last_seen: string
}

const STATUSES = ['all', 'operational', 'in_transit', 'idle', 'alert', 'offline'] as const
type StatusFilter = (typeof STATUSES)[number]

const STATUS_COLOR: Record<Vehicle['status'], string> = {
  operational: 'bg-success-container text-on-success-container',
  in_transit: 'bg-info-container text-on-info-container',
  idle: 'bg-warning-container text-on-warning-container',
  alert: 'bg-error-container text-on-error-container',
  offline: 'bg-surface-container text-on-surface',
}

export function Vehicles() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Vehicle[]>([])
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
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
    plate: '',
    make: '',
    model: '',
    year: '',
    vehicle_type: 'truck',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    return http
      .get('/vehicles')
      .then((res) => {
        setList(unwrapList<Vehicle>(res))
        setError(null)
      })
      .catch(() =>
        setError(t('vehicles.loadError', {}, { defaultValue: 'Failed to load vehicles.' })),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/vehicles')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Vehicle>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('vehicles.loadError', {}, { defaultValue: 'Failed to load vehicles.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function submitNewVehicle(event: React.FormEvent) {
    event.preventDefault()
    if (!form.plate.trim()) {
      setSubmitError(
        t('vehicles.add.error.plateRequired', {}, { defaultValue: 'Plate is required.' }),
      )
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await http.post('/vehicles', {
        license_plate: form.plate.trim(),
        name: form.plate.trim(),
        make: form.make.trim(),
        model: form.model.trim(),
        year: form.year ? Number(form.year) : undefined,
        vehicle_type: form.vehicle_type,
      })
      setShowAdd(false)
      setForm({ plate: '', make: '', model: '', year: '', vehicle_type: 'truck' })
      await load()
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : t('vehicles.add.error.generic', {}, { defaultValue: 'Failed to add vehicle.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((v) => {
      if (filter !== 'all' && v.status !== filter) return false
      if (q && !v.plate.toLowerCase().includes(q) && !(v.driver ?? '').toLowerCase().includes(q))
        return false
      return true
    })
  }, [list, filter, search])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('vehicles.heading', {}, { defaultValue: 'Vehicles' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'vehicles.subheading',
              { count: visible.length, total: list.length },
              { defaultValue: '{{count}} of {{total}} vehicles' },
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
          + {t('vehicles.addLabel', {}, { defaultValue: 'Add vehicle' })}
        </button>
      </header>

      {showAdd ? (
        <div
          className={cm.cn('fixed inset-0 z-50', cm.flex({ align: 'center', justify: 'center' }))}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-vehicle-heading"
        >
          <div
            aria-hidden="true"
            onClick={() => setShowAdd(false)}
            className={cm.cn('absolute inset-0 bg-foreground/40')}
          />
          <form
            onSubmit={submitNewVehicle}
            className={cm.cn(cm.card(), cm.sp('p', 6), 'relative max-w-md w-full', cm.stack(4))}
          >
            <h2
              id="add-vehicle-heading"
              className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
            >
              {t('vehicles.add.heading', {}, { defaultValue: 'Add vehicle' })}
            </h2>

            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('vehicles.add.plate', {}, { defaultValue: 'License plate' })}
              </span>
              <input
                type="text"
                required
                value={form.plate}
                onChange={(e) => setForm({ ...form, plate: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'border border-outline-variant rounded-md font-mono',
                  cm.textSize('sm'),
                )}
              />
            </label>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('vehicles.add.make', {}, { defaultValue: 'Make' })}
              </span>
              <input
                type="text"
                value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
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
                {t('form.model', {}, { defaultValue: 'Model' })}
              </span>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
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
                {t('vehicles.add.year', {}, { defaultValue: 'Year' })}
              </span>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
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
                {t('form.type', {}, { defaultValue: 'Type' })}
              </span>
              <select
                value={form.vehicle_type}
                onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'border border-outline-variant rounded-md',
                  cm.textSize('sm'),
                )}
              >
                <option value="truck">
                  {t('vehicles.add.type.truck', {}, { defaultValue: 'Truck' })}
                </option>
                <option value="van">
                  {t('vehicles.add.type.van', {}, { defaultValue: 'Van' })}
                </option>
                <option value="car">
                  {t('vehicles.add.type.car', {}, { defaultValue: 'Car' })}
                </option>
                <option value="other">
                  {t('vehicles.add.type.other', {}, { defaultValue: 'Other' })}
                </option>
              </select>
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
                  ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                  : t('vehicles.add.submit', {}, { defaultValue: 'Add vehicle' })}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(
            'vehicles.searchPlaceholder',
            {},
            { defaultValue: 'Plate or driver name…' },
          )}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'border border-outline-variant rounded-md flex-1 max-w-md font-mono',
            cm.textSize('sm'),
          )}
        />
        <nav
          aria-label={t('vehicles.filterLabel', {}, { defaultValue: 'Filter vehicles by status' })}
          className={cm.flex({ gap: 'xs', align: 'center' })}
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
                  `vehicles.status.${s}`,
                  {},
                  { defaultValue: s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('vehicles.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('vehicles.empty', {}, { defaultValue: 'No vehicles match.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
          <table className={'w-full text-left text-sm'}>
            <thead>
              <tr className={'border-b border-outline-variant'}>
                <Th>{t('vehicles.col.plate', {}, { defaultValue: 'Plate' })}</Th>
                <Th>{t('vehicles.col.vehicle', {}, { defaultValue: 'Vehicle' })}</Th>
                <Th>{t('vehicles.col.driver', {}, { defaultValue: 'Driver' })}</Th>
                <Th>{t('form.location', {}, { defaultValue: 'Location' })}</Th>
                <Th>{t('vehicles.col.odometer', {}, { defaultValue: 'Odometer' })}</Th>
                <Th>{t('nav.status', {}, { defaultValue: 'Status' })}</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((v) => (
                <tr
                  key={v.id}
                  className={'border-b border-outline-variant hover:bg-surface-container'}
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <Link
                      to={`/vehicles/${v.id}`}
                      className={cm.cn(cm.fontWeight('medium'), 'font-mono', cm.textSize('xs'))}
                    >
                      {v.plate}
                    </Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {v.year} {v.make} {v.model}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('medium'))}>
                    {v.driver ?? '—'}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-on-surface-variant',
                      cm.textSize('xs'),
                    )}
                  >
                    {v.location}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('xs'),
                      'font-mono',
                    )}
                  >
                    {v.odometer.toLocaleString()} mi
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        'rounded',
                        STATUS_COLOR[v.status],
                      )}
                    >
                      {t(
                        `vehicles.status.${v.status}`,
                        {},
                        { defaultValue: v.status.replace('_', ' ') },
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <th
      className={cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        'text-on-surface-variant',
        'uppercase tracking-wider',
      )}
    >
      {children}
    </th>
  )
}
