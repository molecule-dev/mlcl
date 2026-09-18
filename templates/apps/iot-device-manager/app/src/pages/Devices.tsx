import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { FleetDevice } from '../components/DeviceActivityFeed.js'
import { SignalStrength } from '../components/DeviceKpiCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const STATUSES = ['all', 'online', 'warning', 'critical', 'offline'] as const
type StatusFilter = (typeof STATUSES)[number]

const STATUS_PILL: Record<string, string> = {
  online: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  critical: 'bg-error/10 text-error',
  offline: 'bg-on-surface-variant/10 text-on-surface-variant',
  provisioning: 'bg-info/10 text-info',
  decommissioned: 'bg-on-surface-variant/10 text-on-surface-variant',
}

const STATUS_DOT: Record<string, string> = {
  online: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-error',
  offline: 'bg-on-surface-variant',
  provisioning: 'bg-info',
  decommissioned: 'bg-on-surface-variant',
}

const DEVICE_TYPES = ['sensor', 'gateway', 'actuator', 'controller', 'camera', 'other'] as const

function normalizeStatus(status: unknown): FleetDevice['status'] {
  const s = String(status ?? 'offline').toLowerCase()
  if (s === 'online' || s === 'warning' || s === 'critical' || s === 'offline') return s
  return 'offline'
}

function clampSignal(value: unknown): 0 | 1 | 2 | 3 | 4 | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const clamped = Math.max(0, Math.min(4, Math.round(value)))
  return clamped as 0 | 1 | 2 | 3 | 4
}

export function Devices() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<FleetDevice[]>([])
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createSerial, setCreateSerial] = useState('')
  const [createType, setCreateType] = useState<(typeof DEVICE_TYPES)[number]>('sensor')
  const [createBusy, setCreateBusy] = useState(false)

  // Escape closes the register-device modal (keyboard equivalent of the
  // pointer-only backdrop click).
  useEffect(() => {
    if (!showCreate) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !createBusy) setShowCreate(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showCreate, createBusy])
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/devices')
      const fetched = unwrapList<Record<string, unknown>>(res)
      const normalized: FleetDevice[] = fetched.map((d) => ({
        id: String(d.id),
        name: String(d.name ?? ''),
        device_type: String(d.device_type ?? 'sensor'),
        status: normalizeStatus(d.status),
        firmware_version: d.firmware_version ? String(d.firmware_version) : undefined,
        serial_number: d.serial_number ? String(d.serial_number) : undefined,
        signal: clampSignal(d.signal),
        metric_value: typeof d.metric_value === 'number' ? d.metric_value : undefined,
        metric_unit: d.metric_unit ? String(d.metric_unit) : undefined,
      }))
      setList(normalized)
    } catch (error) {
      logError('devices.load', error)
      setError(t('devices.loadError', {}, { defaultValue: 'Failed to load devices.' }))
      setList([])
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!createName.trim() || createBusy) return
      setCreateBusy(true)
      setCreateError(null)
      try {
        const res = await http.post('/api/devices', {
          name: createName.trim(),
          device_type: createType,
          serial_number: createSerial.trim() || null,
        })
        const created = unwrapSingle<Record<string, unknown>>(res)
        if (!created || !created.id) {
          throw new Error(
            t('devices.createError', {}, { defaultValue: 'Failed to register device.' }),
          )
        }
        setShowCreate(false)
        setCreateName('')
        setCreateSerial('')
        setCreateType('sensor')
        await fetchDevices()
      } catch (err) {
        setCreateError(
          err instanceof Error
            ? err.message
            : t('devices.createError', {}, { defaultValue: 'Failed to register device.' }),
        )
      } finally {
        setCreateBusy(false)
      }
    },
    [createName, createSerial, createType, createBusy, fetchDevices, http, t],
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((d) => {
      if (filter !== 'all' && d.status !== filter) return false
      if (
        q &&
        !d.name.toLowerCase().includes(q) &&
        !(d.serial_number ?? '').toLowerCase().includes(q)
      )
        return false
      return true
    })
  }, [list, filter, search])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(6))}>
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
            {t('settings.devices', {}, { defaultValue: 'Devices' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'devices.subheading',
              { count: visible.length, total: list.length },
              { defaultValue: '{{count}} of {{total}} devices' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'font-semibold rounded-full text-white hover:opacity-90 transition-opacity',
          )}
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
          }}
        >
          + {t('devices.addLabel', {}, { defaultValue: 'Register device' })}
        </button>
      </header>

      <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
        <div className={cm.cn('relative flex-1 max-w-md')}>
          <span
            className={cm.cn(
              'absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant material-symbols-outlined',
            )}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'devices.searchPlaceholder',
              {},
              { defaultValue: 'Device name or serial…' },
            )}
            className={cm.cn(
              cm.sp('px', 10),
              cm.sp('py', 2),
              cm.w('full'),
              cm.textSize('sm'),
              'bg-surface-container-lowest border border-outline-variant rounded-full font-mono focus:outline-none focus:ring-2 focus:ring-primary/30',
            )}
          />
        </div>
        <nav
          aria-label={t('devices.filterLabel', {}, { defaultValue: 'Filter devices by status' })}
          className={cm.flex({ gap: 'xs', align: 'center', wrap: 'wrap' })}
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
                  'font-bold uppercase tracking-widest rounded-full',
                  active
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
                )}
                aria-pressed={active}
              >
                {t(`devices.status.${s}`, {}, { defaultValue: s })}
              </button>
            )
          })}
        </nav>
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('devices.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : list.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          <p className={cm.cn(cm.textSize('sm'))}>
            {t(
              'devices.empty',
              {},
              {
                defaultValue:
                  'No devices yet. Register your first device to start streaming telemetry.',
              },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('bg-surface-container-lowest rounded-xl shadow-sm overflow-x-auto')}>
          <table className={cm.cn('w-full text-left text-sm')}>
            <thead className={cm.cn('bg-surface-container-low')}>
              <tr>
                <Th>{t('devices.col.name', {}, { defaultValue: 'Device' })}</Th>
                <Th>{t('devices.col.serial', {}, { defaultValue: 'Serial' })}</Th>
                <Th>{t('devices.col.firmware', {}, { defaultValue: 'Firmware' })}</Th>
                <Th>{t('devices.col.metric', {}, { defaultValue: 'Last metric' })}</Th>
                <Th>{t('devices.col.signal', {}, { defaultValue: 'Signal' })}</Th>
                <Th>{t('nav.status', {}, { defaultValue: 'Status' })}</Th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-surface-container')}>
              {visible.map((d) => (
                <tr
                  key={d.id}
                  className={cm.cn('hover:bg-surface-container-low transition-colors')}
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <Link to={`/devices/${d.id}`} className={cm.cn('flex items-center gap-2')}>
                      <span
                        className={cm.cn(
                          'inline-block w-2 h-2 rounded-full',
                          STATUS_DOT[d.status] ?? STATUS_DOT.offline,
                        )}
                        aria-hidden="true"
                      />
                      <span className={cm.cn('font-bold')}>{d.name}</span>
                    </Link>
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'font-mono text-xs text-primary',
                    )}
                  >
                    {d.serial_number ?? d.id.slice(0, 8)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'font-mono text-xs text-on-surface-variant',
                    )}
                  >
                    v{d.firmware_version ?? '—'}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'font-mono text-xs tabular-nums',
                    )}
                  >
                    {typeof d.metric_value === 'number'
                      ? `${d.metric_value}${d.metric_unit ? ' ' + d.metric_unit : ''}`
                      : '—'}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <SignalStrength bars={d.signal ?? 0} color="#0891b2" dim="#cbd5e1" />
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <span
                      className={cm.cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest',
                        STATUS_PILL[d.status] ?? STATUS_PILL.offline,
                      )}
                    >
                      {t(`devices.status.${d.status}`, {}, { defaultValue: d.status })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="register-device-heading"
          className={cm.cn('fixed inset-0 z-50 flex items-center justify-center p-4')}
        >
          <div
            aria-hidden="true"
            onClick={() => !createBusy && setShowCreate(false)}
            className={cm.cn('absolute inset-0 bg-on-surface/40 backdrop-blur-sm')}
          />
          <div className={cm.cn('relative w-full max-w-md rounded-2xl bg-surface shadow-2xl p-6')}>
            <h2
              id="register-device-heading"
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight mb-4')}
            >
              {t('devices.create.title', {}, { defaultValue: 'Register a new device' })}
            </h2>
            <form onSubmit={handleCreate} className={cm.stack(4)}>
              <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('devices.create.nameLabel', {}, { defaultValue: 'Device name' })}
                </span>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder={t(
                    'devices.create.namePlaceholder',
                    {},
                    { defaultValue: 'Compressor-04' },
                  )}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'bg-surface-container-low rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary/30',
                  )}
                />
              </label>
              <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('devices.create.serialLabel', {}, { defaultValue: 'Serial number' })}
                </span>
                <input
                  type="text"
                  value={createSerial}
                  onChange={(e) => setCreateSerial(e.target.value)}
                  placeholder={t(
                    'devices.create.serialPlaceholder',
                    {},
                    { defaultValue: 'IOT-XXXXXX' },
                  )}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'bg-surface-container-low rounded-xl border border-outline-variant text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30',
                  )}
                />
              </label>
              <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('devices.create.typeLabel', {}, { defaultValue: 'Device type' })}
                </span>
                <select
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value as (typeof DEVICE_TYPES)[number])}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'bg-surface-container-low rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary/30',
                  )}
                >
                  {DEVICE_TYPES.map((dt) => (
                    <option key={dt} value={dt}>
                      {t(`devices.type.${dt}`, {}, { defaultValue: dt })}
                    </option>
                  ))}
                </select>
              </label>

              {createError && (
                <p className={cm.cn(cm.textSize('xs'), 'text-error')}>{createError}</p>
              )}

              <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  disabled={createBusy}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'font-semibold rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50',
                  )}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  disabled={createBusy || !createName.trim()}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'font-semibold rounded-full text-white hover:opacity-90 transition-opacity disabled:opacity-50',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  }}
                >
                  {createBusy
                    ? t('devices.create.submitting', {}, { defaultValue: 'Registering…' })
                    : t('devices.create.submit', {}, { defaultValue: 'Register' })}
                </button>
              </div>
            </form>
          </div>
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
        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
      )}
    >
      {children}
    </th>
  )
}
