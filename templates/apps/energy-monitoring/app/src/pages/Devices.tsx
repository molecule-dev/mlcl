import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type DeviceWattageItem, DeviceWattageRow } from '../components/DeviceWattageRow.js'
import { type EnergyKpi, EnergyKpiTriad } from '../components/EnergyKpiTriad.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface CircuitRow {
  id: string
  name: string
  type: string
  location: string | null
  status: string
  watts: number
  today_kwh: number
  updated_at: string | null
}

type FilterKey = 'all' | 'online' | 'offline' | 'alert'

const METER_TYPES = [
  { key: 'grid', label: 'Grid' },
  { key: 'solar', label: 'Solar' },
  { key: 'battery', label: 'Battery' },
] as const

export function Devices() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [circuits, setCircuits] = useState<CircuitRow[] | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addType, setAddType] = useState<(typeof METER_TYPES)[number]['key']>('grid')
  const [addLocation, setAddLocation] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const payload = await http.get<CircuitRow[]>('/api/readings/circuits')
      const list = unwrapList<CircuitRow>(payload)
      setCircuits(list)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t('devices.loadError', {}, { defaultValue: 'Could not load meters.' })
      setError(msg)
      setCircuits([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const payload = await http.get<CircuitRow[]>('/api/readings/circuits')
        if (cancelled) return
        const list = unwrapList<CircuitRow>(payload)
        setCircuits(list)
      } catch (err) {
        if (cancelled) return
        const msg =
          err instanceof Error
            ? err.message
            : t('devices.loadError', {}, { defaultValue: 'Could not load meters.' })
        setError(msg)
        setCircuits([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t])

  const items: DeviceWattageItem[] = (circuits ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    location: row.location,
    status: row.status === 'active' ? 'online' : row.status === 'inactive' ? 'offline' : row.status,
    watts: Number(row.watts ?? 0),
    todayKwh: row.today_kwh != null ? Number(row.today_kwh) : null,
    updatedAt: row.updated_at,
  }))
  const filtered = filter === 'all' ? items : items.filter((d) => d.status === filter)

  const draw = items.reduce((sum, d) => sum + Math.max(0, d.watts), 0)
  const production = items.reduce((sum, d) => sum + Math.abs(Math.min(0, d.watts)), 0)
  const onlineCount = items.filter((d) => d.status === 'online').length

  const kpis: EnergyKpi[] = [
    {
      key: 'consumption',
      label: 'Total draw right now',
      value: `${draw.toLocaleString()} W`,
      icon: 'electric_bolt',
      tint: 'text-primary',
    },
    {
      key: 'production',
      label: 'Producing right now',
      value: `${production.toLocaleString()} W`,
      icon: 'solar_power',
      tint: 'text-warning',
    },
    {
      key: 'export',
      label: 'Online circuits',
      value: `${onlineCount}/${items.length}`,
      icon: 'sensors',
      tint: 'text-success',
    },
  ]

  const filters: Array<{ key: FilterKey; defaultLabel: string }> = [
    { key: 'all', defaultLabel: 'All' },
    { key: 'online', defaultLabel: 'Online' },
    { key: 'offline', defaultLabel: 'Offline' },
    { key: 'alert', defaultLabel: 'Alerting' },
  ]

  async function submitAdd(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!addName.trim()) {
      setAddError(t('devices.errorName', {}, { defaultValue: 'Give the meter a short name.' }))
      return
    }
    setAddBusy(true)
    setAddError(null)
    try {
      const resp = await http.post<{ id?: string }>('/api/meters', {
        name: addName.trim(),
        type: addType,
        location: addLocation.trim() || undefined,
        unit: 'kWh',
      })
      void track({
        name: 'meter.added',
        properties: {
          meter_id: unwrapSingle<{ id?: string }>(resp)?.id ?? null,
          type: addType,
        },
      })
      setAddName('')
      setAddLocation('')
      setShowAdd(false)
      await load()
    } catch (err) {
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      const fallback =
        err instanceof Error
          ? err.message
          : t('devices.errorAdd', {}, { defaultValue: 'Could not add the meter.' })
      setAddError(apiError ?? fallback)
    } finally {
      setAddBusy(false)
    }
  }

  async function deactivate(id: string): Promise<void> {
    setBusyId(id)
    try {
      await http.post(`/api/meters/${id}/deactivate`, {})
      void track({ name: 'meter.deactivated', properties: { meter_id: id } })
      await load()
    } catch (_error) {
      // swallow — status pill will reflect server state on next load
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      data-mol-id="devices-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('devices.eyebrow', {}, { defaultValue: 'Connected meters' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('devices.heading', {}, { defaultValue: 'Devices & circuits' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'devices.subheading',
            { appName: APP_NAME },
            {
              defaultValue:
                'Live wattage and today\u2019s kWh through every circuit {{appName}} can see.',
            },
          )}
        </p>
      </div>

      {error ? (
        <p
          data-mol-id="devices-error"
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'bg-error-container text-on-error-container rounded-xl text-sm',
          )}
        >
          {error}
        </p>
      ) : null}

      <EnergyKpiTriad kpis={kpis} />

      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              data-mol-id={`devices-filter-${f.key}`}
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest transition-all',
                filter === f.key
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
            >
              {t(`devices.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
            </button>
          ))}
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          <button
            type="button"
            data-mol-id="devices-add-meter"
            onClick={() => setShowAdd((v) => !v)}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest bg-primary text-on-primary hover:bg-primary/90 transition-all',
            )}
          >
            <span
              className={'material-symbols-outlined text-base align-middle mr-1'}
              aria-hidden="true"
            >
              add
            </span>
            {showAdd
              ? t('devices.cancelAdd', {}, { defaultValue: 'Close form' })
              : t('devices.addMeter', {}, { defaultValue: 'Add meter' })}
          </button>
          <Link
            to="/alerts/rules/new"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest bg-surface-container text-on-surface hover:bg-surface-container-high transition-all',
            )}
          >
            <span
              className={'material-symbols-outlined text-base align-middle mr-1'}
              aria-hidden="true"
            >
              notifications
            </span>
            {t('devices.newRule', {}, { defaultValue: 'New alert rule' })}
          </Link>
        </div>
      </div>

      {showAdd ? (
        <form
          data-mol-id="devices-add-form"
          onSubmit={submitAdd}
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl', cm.stack(4))}
        >
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
            <label className={cm.stack(2)}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[11px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.name', {}, { defaultValue: 'Name' })}
              </span>
              <input
                data-mol-id="devices-add-name"
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder={t(
                  'devices.placeholder.name',
                  {},
                  { defaultValue: 'e.g. Garage subpanel' },
                )}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none transition-colors',
                )}
              />
            </label>
            <label className={cm.stack(2)}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[11px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.type', {}, { defaultValue: 'Type' })}
              </span>
              <select
                data-mol-id="devices-add-type"
                value={addType}
                onChange={(e) => setAddType(e.target.value as (typeof METER_TYPES)[number]['key'])}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none',
                )}
              >
                {METER_TYPES.map((m) => (
                  <option key={m.key} value={m.key}>
                    {t(`devices.type.${m.key}`, {}, { defaultValue: m.label })}
                  </option>
                ))}
              </select>
            </label>
            <label className={cm.stack(2)}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[11px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('devices.field.location', {}, { defaultValue: 'Location' })}
              </span>
              <input
                data-mol-id="devices-add-location"
                type="text"
                value={addLocation}
                onChange={(e) => setAddLocation(e.target.value)}
                placeholder={t(
                  'devices.placeholder.location',
                  {},
                  { defaultValue: 'e.g. Mechanical room' },
                )}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none transition-colors',
                )}
              />
            </label>
          </div>
          {addError ? (
            <p
              data-mol-id="devices-add-error"
              role="alert"
              className={cm.cn(cm.textSize('sm'), 'text-error')}
            >
              {addError}
            </p>
          ) : null}
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 'sm' }))}>
            <button
              type="submit"
              data-mol-id="devices-add-submit"
              disabled={addBusy}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-60',
              )}
            >
              {addBusy
                ? t('devices.adding', {}, { defaultValue: 'Adding\u2026' })
                : t('devices.addCta', {}, { defaultValue: 'Add meter' })}
            </button>
          </div>
        </form>
      ) : null}

      {loading && circuits === null ? (
        <p
          data-mol-id="devices-loading"
          className={cm.cn(
            cm.sp('p', 6),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
          )}
        >
          {t('devices.loading', {}, { defaultValue: 'Polling each meter\u2026' })}
        </p>
      ) : items.length === 0 ? (
        <p
          data-mol-id="devices-empty"
          className={cm.cn(
            cm.sp('p', 6),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
          )}
        >
          {t(
            'devices.empty',
            {},
            { defaultValue: 'No meters yet — use “Add meter” to register your first one.' },
          )}
        </p>
      ) : filtered.length === 0 ? (
        <p
          data-mol-id="devices-no-results"
          className={cm.cn(
            cm.sp('p', 6),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
          )}
        >
          {t('devices.noResults', {}, { defaultValue: 'No circuits match this filter.' })}
        </p>
      ) : (
        <div data-mol-id="devices-list" className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {filtered.map((d) => (
            <div key={d.id} className={cm.cn(cm.flex({ align: 'stretch', gap: 'sm' }), 'group')}>
              <div className={cm.cn('flex-1 min-w-0')}>
                <DeviceWattageRow device={d} />
              </div>
              <button
                type="button"
                data-mol-id={`devices-deactivate-${d.id}`}
                onClick={() => void deactivate(d.id)}
                disabled={busyId === d.id || d.status === 'offline'}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors disabled:opacity-50',
                )}
              >
                {busyId === d.id
                  ? t('devices.deactivating', {}, { defaultValue: '\u2026' })
                  : d.status === 'offline'
                    ? t('settings.offline', {}, { defaultValue: 'Offline' })
                    : t('devices.deactivate', {}, { defaultValue: 'Deactivate' })}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
